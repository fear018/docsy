import * as Sentry from '@sentry/nextjs';
import { sentryShared } from './sentry.shared';

Sentry.init({
  ...sentryShared,
  // Session replay is deliberately not enabled: it records what visitors type
  // into other people's support widgets.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
