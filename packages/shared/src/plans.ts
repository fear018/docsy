/**
 * Single source of truth for plan limits and gated features.
 * Never inline a limit anywhere else — import from here.
 */

export const PLAN_IDS = ['free', 'pro', 'business'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** How often indexed sources are refreshed automatically. */
export type SyncSchedule = 'manual' | 'weekly' | 'daily';

/** How much of the widget's look the owner may change. */
export type WidgetCustomisation = 'basic' | 'full';

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in USD. */
  price: number;
  /** Stripe price id, from env. Free has none. */
  stripePriceEnv: string | null;
  tagline: string;
  limits: {
    bots: number;
    /** Indexed pages across all bots. */
    pages: number;
    /** Chat messages per billing period, both channels combined. */
    messagesPerMonth: number;
    /** Conversation retention; null means forever. */
    historyDays: number | null;
  };
  features: {
    /** "Powered by Docsy" shown in the widget. */
    widgetBranding: boolean;
    widgetCustomisation: WidgetCustomisation;
    autoSync: SyncSchedule;
    /** The "questions we could not answer" report. */
    gapReport: boolean;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceEnv: null,
    tagline: 'Index a small docs site and see the answers for yourself.',
    limits: { bots: 1, pages: 50, messagesPerMonth: 100, historyDays: 7 },
    features: {
      widgetBranding: true,
      widgetCustomisation: 'basic',
      autoSync: 'manual',
      gapReport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 39,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    tagline: 'For a live product with real documentation and real visitors.',
    limits: { bots: 3, pages: 1_000, messagesPerMonth: 2_000, historyDays: 90 },
    features: {
      widgetBranding: false,
      widgetCustomisation: 'full',
      autoSync: 'weekly',
      gapReport: true,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 129,
    stripePriceEnv: 'STRIPE_PRICE_BUSINESS',
    tagline: 'Several products, larger docs, daily refresh.',
    limits: { bots: 10, pages: 10_000, messagesPerMonth: 10_000, historyDays: null },
    features: {
      widgetBranding: false,
      widgetCustomisation: 'full',
      autoSync: 'daily',
      gapReport: true,
    },
  },
};

export const DEFAULT_PLAN: PlanId = 'free';

/** Warn the owner once usage crosses this share of a limit. */
export const USAGE_WARNING_THRESHOLD = 0.8;

export function getPlan(id: PlanId | null | undefined): Plan {
  return PLANS[id ?? DEFAULT_PLAN];
}

/** Subscription states that still grant paid access (grace period included). */
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

export function isEntitled(status: string | null | undefined): boolean {
  return status != null && ENTITLED_STATUSES.has(status);
}

/**
 * The plan actually in force: a lapsed subscription silently falls back to free
 * rather than leaving paid features open.
 */
export function effectivePlan(
  plan: PlanId | null | undefined,
  status: string | null | undefined,
): Plan {
  if (plan == null || plan === 'free') return PLANS.free;
  return isEntitled(status) ? PLANS[plan] : PLANS.free;
}

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  /** Share of the limit consumed, capped at 1. */
  ratio: number;
  warn: boolean;
}

export function checkQuota(used: number, limit: number): QuotaCheck {
  const ratio = limit <= 0 ? 1 : Math.min(used / limit, 1);
  return {
    allowed: used < limit,
    used,
    limit,
    ratio,
    warn: ratio >= USAGE_WARNING_THRESHOLD,
  };
}
