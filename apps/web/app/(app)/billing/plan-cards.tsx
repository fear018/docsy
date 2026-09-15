'use client';

import { useActionState } from 'react';
import type { Plan, PlanId } from '@docsy/shared';
import { startCheckout, openPortal, type BillingState } from './actions';
import { FieldError, SubmitButton } from '@/components/ui';

export function PlanCards({
  current,
  plans,
  wanted,
}: {
  current: PlanId;
  plans: Plan[];
  /** The plan chosen on the landing page, carried through sign-in. */
  wanted?: string | null;
}) {
  const [state, action] = useActionState<BillingState, FormData>(startCheckout, {});

  return (
    <>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === current;
          const isWanted = plan.id === wanted && !isCurrent;
          return (
            <div
              key={plan.id}
              className={`border-line rounded-lg border p-4 ${
                isCurrent || isWanted ? 'border-brand' : ''
              } ${isWanted ? 'ring-brand/30 ring-2' : ''}`}
            >
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{plan.name}</p>
                {isCurrent && <span className="text-brand text-xs font-medium">Current</span>}
                {isWanted && (
                  <span className="text-brand text-xs font-medium">You picked this</span>
                )}
              </div>
              <p className="mt-1 text-2xl font-semibold">
                ${plan.price}
                <span className="text-muted text-sm font-normal">/mo</span>
              </p>
              <p className="text-muted mt-2 text-sm">{plan.tagline}</p>
              <ul className="text-muted mt-3 space-y-1 text-sm">
                <li>{plan.limits.bots} bots</li>
                <li>{plan.limits.pages.toLocaleString()} pages</li>
                <li>{plan.limits.messagesPerMonth.toLocaleString()} messages a month</li>
                {!plan.features.widgetBranding && <li>No Docsy branding</li>}
                {plan.features.gapReport && <li>Unanswered-questions report</li>}
              </ul>

              {!isCurrent && plan.id !== 'free' && (
                <form action={action} className="mt-4">
                  <input type="hidden" name="plan" value={plan.id} />
                  <SubmitButton pendingLabel="Opening…" className="w-full">
                    {current === 'free' ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        })}
      </div>
      <FieldError id="billing-error">{state.error}</FieldError>
    </>
  );
}

export function PortalButton() {
  return (
    <form action={openPortal} className="mt-3">
      <SubmitButton variant="ghost" pendingLabel="Opening…">
        Manage in Stripe
      </SubmitButton>
    </form>
  );
}
