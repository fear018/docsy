-- The lexical half of retrieval matched almost nothing for question-shaped
-- queries: websearch_to_tsquery joins terms with AND, so "How do I work with
-- JSON columns?" required one chunk to contain work AND json AND column.
-- Short keyword queries worked, questions did not — which is most of what a
-- chatbot receives.
--
-- Rewriting the tsquery's operators to OR keeps ranking intact: ts_rank_cd
-- still scores a chunk higher when more of the terms hit, so the best match
-- stays on top while partial matches become reachable at all.

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
security invoker
set search_path = ''
as $$
  with query as (
    select to_tsquery(
             'english',
             nullif(replace(websearch_to_tsquery('english', p_query_text)::text, '&', '|'), '')
           ) as tsq
  ),
  dense as (
    select c.id, row_number() over (
             order by c.embedding OPERATOR(extensions.<=>) p_query_embedding
           ) as rank
    from public.chunks c
    where c.bot_id = p_bot_id and c.embedding is not null
    order by c.embedding OPERATOR(extensions.<=>) p_query_embedding
    limit p_candidates
  ),
  lexical as (
    select c.id,
           row_number() over (order by ts_rank_cd(c.fts, query.tsq) desc) as rank
    from public.chunks c, query
    where c.bot_id = p_bot_id
      and query.tsq is not null
      and c.fts @@ query.tsq
    order by ts_rank_cd(c.fts, query.tsq) desc
    limit p_candidates
  ),
  fused as (
    select coalesce(d.id, l.id) as id,
           coalesce(1.0 / (60 + d.rank), 0.0) + coalesce(1.0 / (60 + l.rank), 0.0) as score
    from dense d
    full outer join lexical l on l.id = d.id
  )
  select c.id, c.content, c.heading_path, c.document_id, doc.title, doc.url, f.score
  from fused f
  join public.chunks c on c.id = f.id
  join public.documents doc on doc.id = c.document_id
  order by f.score desc
  limit p_match_count;
$$;
