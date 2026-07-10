import "server-only";
import { db } from "@/db";
import { getBillingState, type BillingPhase } from "./billing";

// Mission Control's Overview module (Part 2 §7) — every number here comes
// straight from tables this app already writes to, no external analytics
// dependency, so it's real and checkable against the data at any time.
const TIER_PRICE_GHS: Record<string, number> = { starter: 466, growth: 933, pro: 1866 };

export async function getOverviewMetrics() {
  const [allTenants, allSubscriptions, allOrders] = await Promise.all([
    db.query.tenants.findMany(),
    db.query.subscriptions.findMany(),
    db.query.orders.findMany(),
  ]);
  const subByTenant = new Map(allSubscriptions.map((s) => [s.tenantId, s]));

  const phaseCounts: Record<BillingPhase, number> = {
    "no-subscription": 0,
    trial: 0,
    grace: 0,
    paused: 0,
    active: 0,
  };
  let mrr = 0;
  for (const tenant of allTenants) {
    const subscription = subByTenant.get(tenant.id);
    const { phase } = getBillingState(subscription);
    phaseCounts[phase]++;
    if (phase === "active" && subscription) {
      mrr += TIER_PRICE_GHS[subscription.tier] ?? 0;
    }
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const signupsThisWeek = allTenants.filter((t) => t.createdAt >= weekAgo).length;

  const paidOrders = allOrders.filter((o) => o.paymentStatus === "paid");
  const gmvCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const pendingOrders = allOrders.filter((o) => o.status === "pending").length;

  return {
    totalTenants: allTenants.length,
    phaseCounts,
    mrr,
    signupsThisWeek,
    totalOrders: allOrders.length,
    paidOrders: paidOrders.length,
    gmvCents,
    pendingOrders,
  };
}
