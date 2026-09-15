-- Indexing a documentation site takes minutes, far longer than one serverless
-- invocation may run. The discovered URL list is stored on the source so work
-- can resume where it stopped instead of re-crawling from scratch.

alter table sources
  add column discovered_urls jsonb not null default '[]'::jsonb,
  -- Set once discovery finishes, so progress can be shown as a fraction.
  add column total_pages integer not null default 0;

-- Used by the worker to find the next source to pick up.
create index sources_pending_idx on sources (updated_at)
  where status in ('queued', 'processing');
