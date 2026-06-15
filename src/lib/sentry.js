import * as Sentry from "@sentry/react";

// Initialise Sentry only when a DSN is configured (production). It is a safe
// no-op in local/dev where VITE_SENTRY_DSN is unset, and Sentry's capture
// helpers also no-op until init() runs.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance tracing — sample 10% of transactions.
    tracesSampleRate: 0.1,
    // Session Replay — 10% of sessions, 100% of sessions with an error.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export { Sentry };
