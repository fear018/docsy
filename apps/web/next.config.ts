import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @docsy/shared ships TypeScript source, not a build artefact.
  transpilePackages: ['@docsy/shared'],
  typedRoutes: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps upload needs SENTRY_AUTH_TOKEN; without it the build still
  // succeeds, stack traces are just minified.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Deliberately not enabling tunnelRoute: it proxies browser traffic through
  // our own server to dodge ad blockers, which adds load and can collide with
  // proxy.ts. Losing reports from ad-blocked visitors is the cheaper trade.
});
