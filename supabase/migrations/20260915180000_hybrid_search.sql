-- Hybrid retrieval: dense vectors plus Postgres full-text, merged with
-- reciprocal rank fusion.
--
-- Vectors alone miss exact tokens — a flag name, an error code, a method — and
-- in dev-tools documentation those are most of what people search for. Full
-- text alone misses paraphrase. RRF needs no score normalisation between the
-- two, which is why it is used instead of a weighted sum of incomparable
-- numbers.

create or replace function match_chunks(
  p_bot_id uuid,
  p_query_embedding extensions.vector(1536),
  p_query_text text,
  p_match_count integer default 6,
  p_candidates integer default 20
)
returns table (
  chunk_id uuid,
  content text,
  heading_path text,
  document_id uuid,
  document_title text,
  document_url text,
  score double precision
)
language sql
stable
-- Security invoker on purpose: called with a user session it must still obey
-- RLS. The widget path calls it with the service role, which bypasses RLS by
-- design after the route has checked the public key, origin and quota.
security invoker
-- search_path is empty, so the cosine operator is schema-qualified explicitly.
set search_path = ''
as $$
  with dense as (
    select c.id, row_number() over (order by c.embedding OPERATOR(extensions.<=>) p_query_embedding) as rank
    from public.chunks c
    where c.bot_id = p_bot_id and c.embedding is not null
    order by c.embedding OPERATOR(extensions.<=>) p_query_embedding
    limit p_candidates
  ),
  lexical as (
    select c.id,
           row_number() over (
             order by ts_rank_cd(c.fts, websearch_to_tsquery('english', p_query_text)) desc
           ) as rank
    from public.chunks c
    where c.bot_id = p_bot_id
      and c.fts @@ websearch_to_tsquery('english', p_query_text)
    limit p_candidates
  ),
  fused as (
    select coalesce(d.id, l.id) as id,
           -- k = 60, the constant from the original RRF paper: it damps the
           -- difference between the top ranks so neither retriever dominates.
           coalesce(1.0 / (60 + d.rank), 0.0) + coalesce(1.0 / (60 + l.rank), 0.0) as score
    from dense d
    full outer join lexical l on l.id = d.id
  )
  select c.id,
         c.content,
         c.heading_path,
         c.document_id,
         doc.title,
         doc.url,
         f.score
  from fused f
  join public.chunks c on c.id = f.id
  join public.documents doc on doc.id = c.document_id
  order by f.score desc
  limit p_match_count;
$$;
