'use server';

import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { z } from 'zod';
import { PLAN_IDS, type PlanId } from '@docsy/shared';
import { createClient } from '@/lib/supabase/server';
import { stripe, priceIdFor } from '@/lib/billing/stripe';

export interface BillingState {
  error?: string;
}

const planSchema = z.enum(PLAN_IDS);

async function appUrl() {
  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  return `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`;
}

/** Reuses the owner's Stripe customer, creating one on first upgrade. */
async function customerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | undefined,
): Promise<string> {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe().customers.create({
    email,
    // The webhook reads this to find the owner without trusting a session.
    metadata: { user_id: userId },
  });

  await supabase
    .from('subscriptions')
    .upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: 'user_id' });

  return customer.id;
}

export async function startCheckout(
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const parsed = planSchema.safeParse(formData.get('plan'));
  if (!parsed.success || parsed.data === 'free') return { error: 'Choose a paid plan.' };

  const price = priceIdFor(parsed.data as PlanId);
  if (!price) return { error: 'Checkout is not configured yet.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let url: string | null = null;

  try {
    const base = await appUrl();
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: await customerId(supabase, user.id, user.email),
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/billing?upgraded=1`,
      cancel_url: `${base}/billing`,
      allow_promotion_codes: true,
      // The customer carries the id too, but a copy on the subscription
      // survives even if the customer record is later replaced.
      subscription_data: { metadata: { user_id: user.id } },
    });
    url = session.url;
  } catch {
    return { error: 'We could not start checkout. Try again in a moment.' };
  }

  if (!url) return { error: 'We could not start checkout. Try again in a moment.' };
  // Stripe's hosted page is external, so it is outside typedRoutes.
  redirect(url as Route);
}

export async function openPortal(): Promise<void> {
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .maybeSingle();

  if (!subscription?.stripe_customer_id) redirect('/billing');

  let url: string;
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${await appUrl()}/billing`,
    });
    url = session.url;
  } catch {
    redirect('/billing?portal=unavailable');
  }

  redirect(url as Route);
}

/**
 * Moves the owner back to Free at the end of the period they paid for.
 *
 * Not an immediate cancellation: they bought the month, and taking it away
 * early would be taking something they are owed. Stripe keeps the subscription
 * active until the period ends and then sends the event that drops the plan.
 */
export async function cancelSubscription(): Promise<void> {
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .maybeSingle();

  if (!subscription?.stripe_subscription_id) redirect('/billing');

  try {
    await stripe().subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch {
    redirect('/billing?cancel=failed');
  }

  redirect('/billing?cancelled=1');
}

/** Undoes the above while the period is still running. */
export async function resumeSubscription(): Promise<void> {
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .maybeSingle();

  if (!subscription?.stripe_subscription_id) redirect('/billing');

  try {
    await stripe().subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
  } catch {
    redirect('/billing?cancel=failed');
  }

  redirect('/billing?resumed=1');
}
