import type { Metadata } from 'next';
import { PLAN_IDS, PLANS } from '@docsy/shared';
import { createClient } from '@/lib/supabase/server';
import { getUsage } from '@/lib/billing/usage';
import { isBillingConfigured } from '@/lib/billing/stripe';
import { PlanCards, PortalButton } from './plan-cards';

export const metadata: Metadata = { title: 'Plan — Docsy' };

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const ratio = limit <= 0 ? 1 : Math.min(used / limit, 1);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="bg-surface border-line mt-1.5 h-1.5 overflow-hidden rounded-full border">
        <div
          className={`h-full rounded-full ${ratio >= 1 ? 'bg-red-500' : 'bg-brand'}`}
          style={{ width: `${Math.max(ratio * 100, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; portal?: string }>;
}) {
  const { upgraded, portal } = await searchParams;
  const supabase = await createClient();
  const usage = await getUsage(supabase);
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('cancel_at_period_end, current_period_end, stripe_customer_id')
    .maybeSingle();

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-lg font-semibold">Plan and usage</h1>
        <p className="text-muted mt-1 text-sm">
          You are on <span className="text-fg font-medium">{usage.plan.name}</span>.
          {subscription?.cancel_at_period_end && periodEnd
            ? ` It ends on ${periodEnd} and you move to Free.`
            : periodEnd
              ? ` Renews ${periodEnd}.`
              : ''}
        </p>
      </div>

      {upgraded && (
        <p role="status" className="border-line bg-surface rounded-lg border p-4 text-sm">
          Payment received. If the plan below still says Free, give it a few seconds — Stripe
          confirms it in the background.
        </p>
      )}

      {portal === 'unavailable' && (
        <p role="alert" className="border-line rounded-lg border p-4 text-sm">
          The billing portal is not reachable right now. Try again in a moment.
        </p>
      )}

      {usage.pastDue && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm"
        >
          The last payment failed. Update your card to keep your plan — nothing has been removed.
        </p>
      )}

      <section className="border-line space-y-4 rounded-lg border p-5">
        <h2 className="font-medium">This month</h2>
        <Meter label="Messages" used={usage.messages.used} limit={usage.messages.limit} />
        <Meter label="Indexed pages" used={usage.pages.used} limit={usage.pages.limit} />
        <Meter label="Bots" used={usage.bots.used} limit={usage.bots.limit} />
        {usage.messages.warn && !usage.messages.allowed && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Your messages are used up for this month. Visitors are told the assistant is unavailable
            — they never see anything about billing.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-medium">Plans</h2>
        {isBillingConfigured() ? (
          <PlanCards current={usage.plan.id} plans={PLAN_IDS.map((id) => PLANS[id])} />
        ) : (
          <p className="text-muted mt-3 text-sm">Checkout is not configured in this environment.</p>
        )}
      </section>

      {subscription?.stripe_customer_id && (
        <section>
          <h2 className="font-medium">Payment details</h2>
          <p className="text-muted mt-1 text-sm">
            Card, invoices, plan changes and cancellation all live in Stripe.
          </p>
          <PortalButton />
        </section>
      )}
    </div>
  );
}
