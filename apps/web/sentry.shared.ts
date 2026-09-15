/**
 * Settings shared by the browser, server and edge runtimes.
 *
 * Sentry stays off in development: the free tier has a monthly error budget
 * and local noise would eat it. The DSN is optional — the app must run
 * without it, so a missing value simply disables reporting.
 */
export const sentryShared = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  // Traces are sampled lightly; this is error reporting, not a performance product.
  tracesSampleRate: 0.1,
};
