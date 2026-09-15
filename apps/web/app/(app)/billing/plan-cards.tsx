'use client';

import { useActionState } from 'react';
import type { Plan, PlanId } from '@docsy/shared';
import {
  startCheckout,
  openPortal,
  cancelSubscription,
  resumeSubscription,
  type BillingState,
} from './actions';
import { FieldError, SubmitButton } from '@/components/ui';

export function PlanCards({
  current,
  plans,
  wanted,
  endingAt,
}: {
  current: PlanId;
  plans: Plan[];
  /** The plan chosen on the landing page, carried through sign-in. */
  wanted?: string | null;
  /** Set when the subscription is already scheduled to end. */
  endingAt?: string | null;
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
              // Flex column so the actions line up across cards whose feature
              // lists are different lengths. A row of buttons at three
              // different heights reads as carelessness.
              className={`border-line flex flex-col rounded-lg border p-4 ${
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
              <ul className="text-muted mt-3 flex-1 space-y-1 text-sm">
                <li>{plan.limits.bots} bots</li>
                <li>{plan.limits.pages.toLocaleString()} pages</li>
                <li>{plan.limits.messagesPerMonth.toLocaleString()} messages a month</li>
                {!plan.features.widgetBranding && <li>No Docsy branding</li>}
                {plan.features.gapReport && <li>Unanswered-questions report</li>}
              </ul>

              {!isCurrent && plan.id !== 'free' && (
                <form action={action} className="mt-4 pt-1">
                  <input type="hidden" name="plan" value={plan.id} />
                  <SubmitButton pendingLabel="Opening…" className="w-full">
                    {current === 'free' ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                  </SubmitButton>
                </form>
              )}

              {/* Moving to Free means ending the subscription. Offering it here
                  rather than only inside Stripe's portal, because a plan you
                  cannot leave from the plans page is a plan you cannot leave. */}
              {plan.id === 'free' && current !== 'free' && (
                <div className="mt-4">
                  {endingAt ? (
                    <>
                      <p className="text-muted mb-2 text-sm">Starts {endingAt}.</p>
                      <form action={resumeSubscription}>
                        <SubmitButton variant="ghost" pendingLabel="Restoring…" className="w-full">
                          Keep my plan
                        </SubmitButton>
                      </form>
                    </>
                  ) : (
                    <form action={cancelSubscription}>
                      <SubmitButton variant="ghost" pendingLabel="Scheduling…" className="w-full">
                        Switch to Free
                      </SubmitButton>
                    </form>
                  )}
                </div>
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
