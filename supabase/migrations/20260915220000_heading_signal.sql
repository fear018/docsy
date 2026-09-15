-- A third retrieval signal: the headings a chunk sits under.
--
-- Broad questions — "what is X", "how does this work" — carry no distinguishing
-- terms, so both existing retrievers land on whatever boilerplate mentions the
-- product. Observed: "what is supabase?" returned three "Resources" link lists,
-- while the page actually titled Database ranked nowhere.
--
-- A page's title and heading path say what it is about, which is exactly the
-- signal a vague question needs and the one the body text drowns out.

create index if not exists chunks_heading_fts_idx on chunks
  using gin (to_tsvector('english', coalesce(heading_path, '')));

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
    select c.id, row_number() over (order by ts_rank_cd(c.fts, query.tsq) desc) as rank
    from public.chunks c, query
    where c.bot_id = p_bot_id and query.tsq is not null and c.fts @@ query.tsq
    order by ts_rank_cd(c.fts, query.tsq) desc
    limit p_candidates
  ),
  headings as (
    select c.id,
           row_number() over (
             order by ts_rank_cd(
               to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(c.heading_path, '')),
               query.tsq
             ) desc
           ) as rank
    from public.chunks c
    join public.documents d on d.id = c.document_id, query
    where c.bot_id = p_bot_id
      and query.tsq is not null
      and to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(c.heading_path, ''))
          @@ query.tsq
    order by rank
    limit p_candidates
  ),
  fused as (
    select id, sum(weight) as score
    from (
      select id, 1.0 / (60 + rank) as weight from dense
      union all
      select id, 1.0 / (60 + rank) from lexical
      union all
      -- Half weight: a matching heading is a strong hint about what a page is
      -- for, but the answer still has to be in the text.
      select id, 0.5 / (60 + rank) from headings
    ) signals
    group by id
  )
  select c.id, c.content, c.heading_path, c.document_id, doc.title, doc.url, f.score
  from fused f
  join public.chunks c on c.id = f.id
  join public.documents doc on doc.id = c.document_id
  order by f.score desc
  limit p_match_count;
$$;
