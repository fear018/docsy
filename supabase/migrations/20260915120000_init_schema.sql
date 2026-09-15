-- Docsy initial schema.
-- Multi-tenant by owner: every row traces back to a user through bot_id or user_id.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------- enums

create type plan_id as enum ('free', 'pro', 'business');
create type source_type as enum ('file', 'url', 'sitemap', 'text');
create type source_status as enum ('queued', 'processing', 'ready', 'error');
create type message_role as enum ('user', 'assistant');
create type chat_channel as enum ('app', 'widget');

-- ------------------------------------------------------------- utilities

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------- profiles

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- A profile row must exist the moment a user signs up, so the app never has to
-- special-case "signed in but no profile yet".
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- --------------------------------------------------------- subscriptions

create table subscriptions (
  user_id uuid primary key references profiles on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan plan_id not null default 'free',
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------ bots

create table bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  name text not null,
  system_prompt text,
  tone text not null default 'friendly',
  -- Public, embeddable identifier. Not a secret: origin allowlist and rate
  -- limits are what actually protect the widget endpoint.
  public_key text not null unique,
  widget_config jsonb not null default '{}'::jsonb,
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bots_user_id_idx on bots (user_id);

create trigger bots_updated_at
  before update on bots
  for each row execute function set_updated_at();

-- --------------------------------------------------------------- sources

create table sources (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references bots on delete cascade,
  type source_type not null,
  url text,
  filename text,
  storage_path text,
  status source_status not null default 'queued',
  pages_count integer not null default 0,
  auto_sync boolean not null default true,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sources_bot_id_idx on sources (bot_id);
create index sources_status_idx on sources (status) where status in ('queued', 'processing');

create trigger sources_updated_at
  before update on sources
  for each row execute function set_updated_at();

-- ------------------------------------------------------------- documents

create table documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources on delete cascade,
  bot_id uuid not null references bots on delete cascade,
  title text,
  url text,
  -- Lets a re-sync skip unchanged pages instead of re-embedding them.
  content_hash text not null,
  created_at timestamptz not null default now()
);

create index documents_source_id_idx on documents (source_id);
create unique index documents_source_url_idx on documents (source_id, url) where url is not null;

-- ---------------------------------------------------------------- chunks

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents on delete cascade,
  bot_id uuid not null references bots on delete cascade,
  content text not null,
  -- e.g. 'Getting Started > Installation > Docker'; doubles as the citation label.
  heading_path text,
  token_count integer not null default 0,
  embedding extensions.vector(1536),
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

create index chunks_document_id_idx on chunks (document_id);
create index chunks_bot_id_idx on chunks (bot_id);
create index chunks_fts_idx on chunks using gin (fts);
create index chunks_embedding_idx on chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- --------------------------------------------------------- conversations

create table conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references bots on delete cascade,
  channel chat_channel not null,
  title text,
  -- Anonymous, widget-side identifier. Never a real person's data.
  visitor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_bot_id_created_idx on conversations (bot_id, created_at desc);

create trigger conversations_updated_at
  before update on conversations
  for each row execute function set_updated_at();

-- -------------------------------------------------------------- messages

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  role message_role not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  -- false when the model reported it could not answer from the context;
  -- this is what feeds the content-gap report.
  was_answered boolean,
  tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);
create index messages_unanswered_idx on messages (created_at desc)
  where was_answered = false;

-- -------------------------------------------------------- usage counters

create table usage_counters (
  user_id uuid not null references profiles on delete cascade,
  period_start date not null,
  messages_used integer not null default 0,
  pages_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create trigger usage_counters_updated_at
  before update on usage_counters
  for each row execute function set_updated_at();

-- ------------------------------------------- stripe webhook idempotency

create table processed_events (
  stripe_event_id text primary key,
  processed_at timestamptz not null default now()
);
