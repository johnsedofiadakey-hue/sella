import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, orders } from "@/db";
import { getTenantBySlug, getSubscriptionForTenant, CATEGORY_LABELS } from "@/lib/tenants";
import { getBillingState } from "@/lib/billing";
import Stat from "@/components/mission-control/Stat";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const subscription = await getSubscriptionForTenant(tenant.id);
  const billing = getBillingState(subscription);
  const tenantOrders = await db.query.orders.findMany({
    where: eq(orders.tenantId, tenant.id),
    orderBy: [desc(orders.createdAt)],
    limit: 10,
  });
  const paidTotal = tenantOrders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <div>
      <Link href="/mission-control/tenants" className="text-xs text-ink-muted underline">
        ← Tenants
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">{tenant.businessName}</h1>
          <p className="text-sm text-ink-muted">
            {tenant.slug}.sella.app · {CATEGORY_LABELS[tenant.category] ?? tenant.category}
          </p>
        </div>
        {/* Read-only staff view for now — real impersonation (session
            swap + audit log per Part 2 §7) is a follow-up, not this. */}
        <a
          href={`/?store=${tenant.slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-forest"
        >
          View live store →
        </a>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tenant status" value={tenant.status} />
        <Stat label="Billing phase" value={billing.phase} />
        <Stat label="Tier" value={subscription?.tier ?? "—"} />
        <Stat label="KYC level" value={String(tenant.kycLevel)} />
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Orders (last 10)
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Shown" value={String(tenantOrders.length)} />
        <Stat label="Paid total" value={`GHS ${(paidTotal / 100).toLocaleString()}`} />
        <Stat label="Payout linked" value={tenant.paystackSubaccountCode ? "Yes" : "No"} />
      </div>

      {tenantOrders.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2 font-semibold">Order</th>
                <th className="px-4 py-2 font-semibold">Buyer</th>
                <th className="px-4 py-2 font-semibold">Total</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Payment</th>
              </tr>
            </thead>
            <tbody>
              {tenantOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 text-ink">{order.buyerName}</td>
                  <td className="px-4 py-2 tabular-nums text-ink-muted">
                    GHS {(order.totalCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 capitalize text-ink-muted">
                    {order.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2 capitalize text-ink-muted">{order.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
