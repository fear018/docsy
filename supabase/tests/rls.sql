-- RLS isolation check.
-- Run against a freshly reset local database:
--   pnpm db:reset && pnpm db:test:rls
-- Every count below must match the number stated in its label.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','alice@example.com','x',now(),now()),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bob@example.com','x',now(),now());

insert into public.bots (id, user_id, name, public_key) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Alice bot','pk_alice'),
  ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Bob bot','pk_bob');

insert into public.sources (bot_id, type, url) values
  ('bbbbbbbb-0000-0000-0000-000000000002','url','https://bob.example.com/docs');

select 'profiles auto-created: ' || count(*) as result from public.profiles;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
  select 'alice sees bots (expect 1): ' || count(*) as result from public.bots;
  select 'alice sees bob''s sources (expect 0): ' || count(*) as result from public.sources;
  select 'alice sees profiles (expect 1): ' || count(*) as result from public.profiles;
commit;

begin;
  set local role anon;
  set local request.jwt.claims = '{"role":"anon"}';
  select 'anon sees bots (expect 0): ' || count(*) as result from public.bots;
  select 'anon sees subscriptions (expect 0): ' || count(*) as result from public.subscriptions;
  select 'anon sees chunks (expect 0): ' || count(*) as result from public.chunks;
commit;
