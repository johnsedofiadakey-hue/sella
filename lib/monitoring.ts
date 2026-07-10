import * as Sentry from "@sentry/nextjs";

// Dormant until a DSN exists (Part 5 Phase 0 doesn't provision a Sentry
// project yet) — same "log locally, wire the real thing once the account
// exists" pattern as lib/otp.ts and lib/paystack.ts. Sentry.init with an
// empty dsn is a documented no-op, so every call site here stays safe to
// leave in unconditionally rather than branching on whether it's configured.
const dsn = process.env.SENTRY_DSN;

export function initSentryServer() {
  Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: dsn ? 0.1 : 0 });
}

export function initSentryEdge() {
  Sentry.init({ dsn, environment: process.env.NODE_ENV });
}

export function captureError(error: unknown) {
  if (!dsn) {
    console.error("[error]", error);
    return;
  }
  Sentry.captureException(error);
}
