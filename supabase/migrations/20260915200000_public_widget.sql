-- Everything the public widget endpoint needs before it is allowed to spend
-- money on a model call.

-- ---------------------------------------------------------------- rate limit
-- Keyed by a salted hash, never a raw address: the product promises not to
-- collect visitor data, and an IP column would quietly break that promise.
create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);

alter table rate_limits enable row level security;
-- No policies: the service role is the only caller.

create index rate_limits_window_idx on rate_limits (window_start);

/**
 * Counts one hit against `p_key` and reports whether it is still under the
 * limit. Atomic, because two visitors arriving together would otherwise both
 * read the old count and both be let through.
 */
create or replace function consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
                 when public.rate_limits.window_start < now() - p_window then 1
                 else public.rate_limits.hits + 1
               end,
        window_start = case
                         when public.rate_limits.window_start < now() - p_window then now()
                         else public.rate_limits.window_start
                       end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

-- -------------------------------------------------------------------- quota
/**
 * Spends one message from the owner's monthly allowance, returning false when
 * it is exhausted.
 *
 * Checked before the model is called, not after: the free plan would otherwise
 * be unmetered spend on OpenAI. Atomic for the same reason as above.
 */
create or replace function consume_message_quota(
  p_user_id uuid,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_used integer;
begin
  insert into public.usage_counters (user_id, period_start, messages_used)
  values (p_user_id, v_period, 1)
  on conflict (user_id, period_start) do update
    set messages_used = public.usage_counters.messages_used + 1
  returning messages_used into v_used;

  if v_used > p_limit then
    -- Give the message back so a refused request does not consume allowance.
    update public.usage_counters
      set messages_used = public.usage_counters.messages_used - 1
      where user_id = p_user_id and period_start = v_period;
    return false;
  end if;

  return true;
end;
$$;

-- ------------------------------------------------------- widget lookup view
-- One statement for what the public endpoint needs: the bot, its owner's plan
-- and its allowed origins, found by public key.
create or replace function bot_by_public_key(p_public_key text)
returns table (
  bot_id uuid,
  owner_id uuid,
  tone text,
  widget_config jsonb,
  allowed_origins text[],
  plan public.plan_id,
  subscription_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id,
         b.user_id,
         b.tone,
         b.widget_config,
         b.allowed_origins,
         coalesce(s.plan, 'free'::public.plan_id),
         s.status
  from public.bots b
  left join public.subscriptions s on s.user_id = b.user_id
  where b.public_key = p_public_key;
$$;
