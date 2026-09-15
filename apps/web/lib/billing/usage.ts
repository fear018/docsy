import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@docsy/shared';
import { effectivePlan, checkQuota, type Plan, type QuotaCheck } from '@docsy/shared';

export interface Usage {
  plan: Plan;
  messages: QuotaCheck;
  pages: QuotaCheck;
  bots: QuotaCheck;
  /** Set while a payment has failed but access has not been withdrawn yet. */
  pastDue: boolean;
}

/** Calendar month, matching consume_message_quota in the database. */
function periodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/**
 * What the owner has used this period, against what their plan allows.
 *
 * Read under the caller's session: RLS scopes every count to them, so there is
 * no user_id filter and no way to read someone else's usage by accident.
 */
export async function getUsage(supabase: SupabaseClient<Database>): Promise<Usage> {
  const [{ data: subscription }, { count: pages }, { count: bots }, { data: counter }] =
    await Promise.all([
      supabase.from('subscriptions').select('plan, status').maybeSingle(),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('bots').select('id', { count: 'exact', head: true }),
      supabase
        .from('usage_counters')
        .select('messages_used')
        .eq('period_start', periodStart())
        .maybeSingle(),
    ]);

  const plan = effectivePlan(subscription?.plan, subscription?.status);

  return {
    plan,
    messages: checkQuota(counter?.messages_used ?? 0, plan.limits.messagesPerMonth),
    pages: checkQuota(pages ?? 0, plan.limits.pages),
    bots: checkQuota(bots ?? 0, plan.limits.bots),
    pastDue: subscription?.status === 'past_due',
  };
}
