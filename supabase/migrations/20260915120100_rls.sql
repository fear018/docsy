-- Row level security.
--
-- Two access paths exist in this product:
--   1. the owner, acting through a Supabase Auth session — governed by the policies below;
--   2. the public widget, which never touches the database directly. It goes through
--      server routes that use the service role after checking the bot's public key,
--      the request Origin and the plan quota.
-- Therefore no policy here grants anything to anon.

-- Ownership test used by every nested table. Not security definer on purpose:
-- it must run under the caller's own rights.
create or replace function owns_bot(target_bot_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.bots
    where bots.id = target_bot_id
      and bots.user_id = (select auth.uid())
  );
$$;

alter table profiles        enable row level security;
alter table subscriptions   enable row level security;
alter table bots            enable row level security;
alter table sources         enable row level security;
alter table documents       enable row level security;
alter table chunks          enable row level security;
alter table conversations   enable row level security;
alter table messages        enable row level security;
alter table usage_counters  enable row level security;
alter table processed_events enable row level security;

-- -------------------------------------------------------------- profiles

create policy "own profile is readable"
  on profiles for select
  using ((select auth.uid()) = id);

create policy "own profile is editable"
  on profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- --------------------------------------------------------- subscriptions
-- Read-only to the owner. Every write comes from the Stripe webhook, which
-- runs with the service role.

create policy "own subscription is readable"
  on subscriptions for select
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------------ bots

create policy "own bots are readable"
  on bots for select
  using ((select auth.uid()) = user_id);

create policy "bots are created for self"
  on bots for insert
  with check ((select auth.uid()) = user_id);

create policy "own bots are editable"
  on bots for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own bots are deletable"
  on bots for delete
  using ((select auth.uid()) = user_id);

-- --------------------------------------------------- bot-scoped tables

create policy "sources of own bots are readable"
  on sources for select using (owns_bot(bot_id));
create policy "sources are added to own bots"
  on sources for insert with check (owns_bot(bot_id));
create policy "sources of own bots are editable"
  on sources for update using (owns_bot(bot_id)) with check (owns_bot(bot_id));
create policy "sources of own bots are deletable"
  on sources for delete using (owns_bot(bot_id));

create policy "documents of own bots are readable"
  on documents for select using (owns_bot(bot_id));
create policy "documents of own bots are deletable"
  on documents for delete using (owns_bot(bot_id));

create policy "chunks of own bots are readable"
  on chunks for select using (owns_bot(bot_id));
create policy "chunks of own bots are deletable"
  on chunks for delete using (owns_bot(bot_id));

create policy "conversations of own bots are readable"
  on conversations for select using (owns_bot(bot_id));
create policy "conversations of own bots are deletable"
  on conversations for delete using (owns_bot(bot_id));

create policy "messages of own bots are readable"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and owns_bot(conversations.bot_id)
    )
  );

create policy "messages of own bots are deletable"
  on messages for delete
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and owns_bot(conversations.bot_id)
    )
  );

-- -------------------------------------------------------- usage counters
-- Read-only to the owner; the server increments them.

create policy "own usage is readable"
  on usage_counters for select
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------ processed events
-- Deliberately no policies: service role only.
