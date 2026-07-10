import * as Sentry from "@sentry/nextjs";

// Browser-side counterpart to lib/monitoring.ts — same dormant-without-a-DSN
// pattern, just using the NEXT_PUBLIC_ variant since this file ships to the
// client bundle.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}
