-- Storage for uploaded source files, and a default for the widget's public key.

-- Private bucket: files are the customer's documentation and must never be
-- world-readable. The app hands out signed URLs when it needs to read one.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Paths are '<user_id>/<bot_id>/<filename>', so the first segment decides
-- ownership.
create policy "owners read their own source files"
  on storage.objects for select
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owners upload their own source files"
  on storage.objects for insert
  with check (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owners delete their own source files"
  on storage.objects for delete
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Generate the widget key in the database so a bot can never exist without one.
-- Not a secret: the origin allowlist and rate limits are what protect the
-- widget endpoint.
alter table bots
  alter column public_key set default ('pk_' || encode(extensions.gen_random_bytes(16), 'hex'));
