import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { createServiceClient } from '@/lib/supabase/service';
import { stripe, planForPrice } from '@/lib/billing/stripe';

/**
 * Where Stripe reports what actually happened.
 *
 * Two rules make this safe to expose:
 *
 * 1. The signature is verified against the raw body. Without that check anyone
 *    could grant themselves a plan with a POST.
 * 2. Every event is recorded before it is acted on. Stripe retries delivery,
 *    and a retried upgrade must not be applied twice.
 */

const HANDLED = new Set<Stripe.Event.Type>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

async function ownerOf(
  supabase: ReturnType<typeof createServiceClient>,
  customerId: string,
  metadataUserId?: string | null,
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;

  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function applySubscription(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription,
) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const userId = await ownerOf(supabase, customerId, subscription.metadata?.user_id);
  if (!userId) return;

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  // A cancelled subscription drops the owner back to free rather than leaving
  // a paid plan with a dead status.
  const active = subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired';
  const periodEnd = item?.current_period_end ?? null;

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: active ? planForPrice(priceId) : 'free',
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    },
    { onConflict: 'user_id' },
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');

  if (!secret || !signature) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 400 });
  }

  // The raw body, not the parsed one: the signature covers the exact bytes.
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  const supabase = createServiceClient();

  // Insert first: a duplicate delivery collides on the primary key and stops
  // here, before anything is changed.
  const { error: seen } = await supabase
    .from('processed_events')
    .insert({ stripe_event_id: event.id });
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.subscription) {
          const id =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          await applySubscription(supabase, await stripe().subscriptions.retrieve(id));
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(supabase, event.data.object);
        break;

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? '');
        const userId = await ownerOf(supabase, customerId);
        // Access is not withdrawn here. Stripe retries the payment, and the
        // owner sees a banner asking them to update their card.
        if (userId) {
          await supabase.from('subscriptions').update({ status: 'past_due' }).eq('user_id', userId);
        }
        break;
      }
    }
  } catch (error) {
    Sentry.captureException(error);
    // Let the event be retried rather than swallowing a failed update.
    await supabase.from('processed_events').delete().eq('stripe_event_id', event.id);
    return NextResponse.json({ error: 'Processing failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
