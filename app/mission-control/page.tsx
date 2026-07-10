import { getOverviewMetrics } from "@/lib/metrics";
import Stat from "@/components/mission-control/Stat";

export default async function MissionControlOverview() {
  const metrics = await getOverviewMetrics();

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Overview</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="MRR" value={`GHS ${metrics.mrr.toLocaleString()}`} />
        <Stat label="Active merchants" value={String(metrics.phaseCounts.active)} />
        <Stat label="Signups this week" value={String(metrics.signupsThisWeek)} />
        <Stat label="GMV (paid orders)" value={`GHS ${(metrics.gmvCents / 100).toLocaleString()}`} />
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Merchants by billing state
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Trial" value={String(metrics.phaseCounts.trial)} />
        <Stat label="Grace" value={String(metrics.phaseCounts.grace)} />
        <Stat label="Paused" value={String(metrics.phaseCounts.paused)} />
        <Stat label="Active" value={String(metrics.phaseCounts.active)} />
        <Stat label="No subscription" value={String(metrics.phaseCounts["no-subscription"])} />
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted">Orders</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total orders" value={String(metrics.totalOrders)} />
        <Stat label="Paid orders" value={String(metrics.paidOrders)} />
        <Stat label="Pending confirmation" value={String(metrics.pendingOrders)} />
      </div>
    </div>
  );
}
