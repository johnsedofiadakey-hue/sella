import { desc, eq } from "drizzle-orm";
import { db, disputes, tenants, orders } from "@/db";
import { isEscalated, isResolved } from "@/lib/disputes";
import DisputeRow from "./dispute-row";

export default async function DisputesQueuePage() {
  const all = await db
    .select({ dispute: disputes, tenant: tenants, order: orders })
    .from(disputes)
    .innerJoin(tenants, eq(tenants.id, disputes.tenantId))
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .orderBy(desc(disputes.createdAt));

  // "Escalated" folds in overdue-unresponded disputes too (lib/disputes.ts
  // computes that lazily) — this queue is StormGlide's, so only disputes
  // that actually need staff attention belong here, not fresh ones still
  // inside the merchant's 48h window.
  const needsAttention = all.filter(({ dispute }) => !isResolved(dispute) && isEscalated(dispute));

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Disputes</h1>
      {needsAttention.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Nothing escalated.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {needsAttention.map(({ dispute, tenant, order }) => (
            <DisputeRow key={dispute.id} dispute={dispute} tenant={tenant} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
