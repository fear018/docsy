-- How many pages one crawl may take.
--
-- A documentation site with a thousand pages is ordinary, and indexing all of
-- it before the owner has seen a single answer is not what they came for: it
-- spends their whole allowance, takes many minutes, and they cannot close the
-- tab while it runs. The owner now says how much to take.

alter table sources
  add column max_pages integer not null default 50
    constraint sources_max_pages_sane check (max_pages between 1 and 500);
