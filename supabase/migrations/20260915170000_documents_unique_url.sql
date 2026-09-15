-- ON CONFLICT cannot infer a partial unique index, so the upsert that keeps
-- concurrently processed pages from racing had no constraint to target.
--
-- A plain unique index works because Postgres treats NULLs as distinct: file
-- and text sources, whose url is null, are unaffected — each has one document
-- anyway.

drop index if exists documents_source_url_idx;

create unique index documents_source_url_idx on documents (source_id, url);
