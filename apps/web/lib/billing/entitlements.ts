import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@docsy/shared';
import { getUsage, type Usage } from './usage';

/**
 * What a downgrade means for bots that no longer fit the plan.
 *
 * Nothing is deleted. The oldest bots stay fully editable and the extras go
 * read-only: their sources are frozen, their settings locked. Their widgets
 * keep answering, because a plan change on our side must not silently break a
 * page on the customer's site — and the message allowance already caps what
 * that can cost.
 *
 * Deleting data on downgrade would be the easy implementation and the wrong
 * one: the owner may be downgrading for a month, and their documentation is
 * not ours to throw away.
 */
export interface Entitlements {
  usage: Usage;
  /** Bots frozen because they exceed the current plan's allowance. */
  readOnlyBotIds: Set<string>;
  canCreateBot: boolean;
  canAddSource: boolean;
}

export async function getEntitlements(supabase: SupabaseClient<Database>): Promise<Entitlements> {
  const usage = await getUsage(supabase);

  const { data: bots } = await supabase
    .from('bots')
    .select('id')
    .order('created_at', { ascending: true });

  const readOnlyBotIds = new Set((bots ?? []).slice(usage.plan.limits.bots).map((bot) => bot.id));

  return {
    usage,
    readOnlyBotIds,
    canCreateBot: usage.bots.allowed,
    canAddSource: usage.pages.allowed,
  };
}

export function isReadOnly(entitlements: Entitlements, botId: string): boolean {
  return entitlements.readOnlyBotIds.has(botId);
}
