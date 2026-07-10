import "server-only";
import { eq } from "drizzle-orm";
import { db, subscriptions, tenants, type Subscription } from "@/db";

// Part 3 §1's trial mechanics: 30-day free trial, then a 7-day grace
// period with the store still live, then pause (never delete). Computed
// on demand from stored dates rather than flipped by a background job —
// there's no scheduler in this stack yet, and a lazily-evaluated phase is
// exactly as correct at request time as a cron-updated status column
// would be, without needing infrastructure that doesn't exist.
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type BillingPhase = "no-subscription" | "trial" | "grace" | "paused" | "active";

export type BillingState = {
  phase: BillingPhase;
  /** Days left in trial, or days left in grace before pause. Null otherwise. */
  daysRemaining: number | null;
};

function daysUntil(target: Date, now: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS));
}

export function getBillingState(
  subscription: Subscription | undefined | null,
  now: Date = new Date(),
): BillingState {
  if (!subscription) return { phase: "no-subscription", daysRemaining: null };

  if (subscription.status === "active" && subscription.currentPeriodEnd) {
    if (subscription.currentPeriodEnd > now) {
      return { phase: "active", daysRemaining: null };
    }
    // Paid before, but the period lapsed without renewing — same grace
    // window as a first-time trial before the store pauses.
    const graceEnd = new Date(subscription.currentPeriodEnd.getTime() + GRACE_PERIOD_MS);
    return now < graceEnd
      ? { phase: "grace", daysRemaining: daysUntil(graceEnd, now) }
      : { phase: "paused", daysRemaining: 0 };
  }

  if (subscription.trialEndsAt) {
    if (now < subscription.trialEndsAt) {
      return { phase: "trial", daysRemaining: daysUntil(subscription.trialEndsAt, now) };
    }
    const graceEnd = new Date(subscription.trialEndsAt.getTime() + GRACE_PERIOD_MS);
    return now < graceEnd
      ? { phase: "grace", daysRemaining: daysUntil(graceEnd, now) }
      : { phase: "paused", daysRemaining: 0 };
  }

  return { phase: "paused", daysRemaining: 0 };
}

// Shared by the billing callback page (immediate UX) and the Paystack
// webhook (authoritative) — same pattern as checkout's order payments.
export async function activateSubscriptionPayment(tenantId: string): Promise<void> {
  const periodEnd = new Date(Date.now() + 30 * DAY_MS);
  await db
    .update(subscriptions)
    .set({ status: "active", currentPeriodEnd: periodEnd, dunningAttempts: 0 })
    .where(eq(subscriptions.tenantId, tenantId));
  await db.update(tenants).set({ status: "active", updatedAt: new Date() }).where(eq(tenants.id, tenantId));
}
