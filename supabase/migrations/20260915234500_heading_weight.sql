-- A title match counts as much as a body match.
--
-- "Is there a way to connect Metabase?" ranked Beekeeper Studio and DBeaver
-- above the page actually titled "Connecting to Metabase": the OR-joined
-- lexical query matched "connect" on every integration page, and the one rare
-- word that mattered carried the same weight as the common ones.
--
-- A rare term in a page title is the strongest signal available for questions
-- of the form "how do I use X" — which is most of what an integration section
-- is asked. Half weight was too cautious.

create or replace function match_chunks(
  p_bot_id uuid,
  p_query_embedding extensions.vector(1536),
  p_query_text text,
  p_match_count integer default 6,
  p_candidates integer default 20
)
returns table (
  chunk_id uuid, content text, heading_path text, document_id uuid,
  document_title text, document_url text, score double precision
)
language sql stable security invoker set search_path = ''
as $$
  with bot_chunks as materialized (
    select c.id, c.embedding, c.fts, c.heading_path, c.document_id
    from public.chunks c where c.bot_id = p_bot_id
  ),
  query as (
    select to_tsquery('english',
      nullif(replace(websearch_to_tsquery('english', p_query_text)::text, '&', '|'), '')) as tsq
  ),
  dense as (
    select b.id, row_number() over (
      order by b.embedding OPERATOR(extensions.<=>) p_query_embedding) as rank
    from bot_chunks b where b.embedding is not null
    order by b.embedding OPERATOR(extensions.<=>) p_query_embedding limit p_candidates
  ),
  lexical as (
    select b.id, row_number() over (order by ts_rank_cd(b.fts, query.tsq) desc) as rank
    from bot_chunks b, query
    where query.tsq is not null and b.fts @@ query.tsq
    order by ts_rank_cd(b.fts, query.tsq) desc limit p_candidates
  ),
  headings as (
    select b.id, row_number() over (order by ts_rank_cd(
      to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(b.heading_path, '')),
      query.tsq) desc) as rank
    from bot_chunks b join public.documents d on d.id = b.document_id, query
    where query.tsq is not null
      and to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(b.heading_path, ''))
          @@ query.tsq
    order by rank limit p_candidates
  ),
  fused as (
    select id, sum(weight) as score from (
      select id, 1.0 / (60 + rank) as weight from dense
      union all select id, 1.0 / (60 + rank) from lexical
      union all select id, 1.0 / (60 + rank) from headings
    ) signals group by id
  )
  select c.id, c.content, c.heading_path, c.document_id, doc.title, doc.url, f.score
  from fused f
  join public.chunks c on c.id = f.id
  join public.documents doc on doc.id = c.document_id
  order by f.score desc limit p_match_count;
$$;
