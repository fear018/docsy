import Stripe from 'stripe';
import { PLANS, type PlanId } from '@docsy/shared';

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
  client ??= new Stripe(key, { apiVersion: '2026-08-26.dahlia' });
  return client;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);
}

/** The Stripe price for a paid plan, or null for free. */
export function priceIdFor(plan: PlanId): string | null {
  const env = PLANS[plan].stripePriceEnv;
  return env ? (process.env[env] ?? null) : null;
}

/** Which plan a Stripe price belongs to, so a webhook can name it. */
export function planForPrice(priceId: string | null | undefined): PlanId {
  if (!priceId) return 'free';
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceEnv && process.env[plan.stripePriceEnv] === priceId) return plan.id;
  }
  return 'free';
}
