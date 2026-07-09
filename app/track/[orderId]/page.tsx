import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, orders, orderItems, tenants } from "@/db";

// Order dispute types (cancelled/disputed) fall outside this happy-path
// timeline — Part 2 §6's dispute centre is separate, later work.
const STATUS_STEPS = [
  { key: "pending", label: "Order received" },
  { key: "confirmed", label: "Confirmed" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ otp?: string }>;
}) {
  const { orderId } = await params;
  const { otp } = await searchParams;

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) notFound();

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, order.tenantId) });
  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, order.id) });

  const currentIndex = STATUS_STEPS.findIndex((step) => step.key === order.status);

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {tenant?.businessName ?? "Order"}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">
        Order #{order.id.slice(0, 8)}
      </h1>

      {otp && (
        <div className="mt-4 rounded-lg border border-gold bg-forest-tint p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-ink">
            Your delivery code
          </p>
          <p className="mt-1 text-3xl font-bold tracking-[0.3em] text-gold-ink">{otp}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Give this to your rider when your order arrives. Save this page — the code won&apos;t
            be shown again.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {STATUS_STEPS.map((step, i) => {
          const reached = currentIndex >= 0 && i <= currentIndex;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${reached ? "bg-forest" : "bg-border"}`} />
              <p className={`text-sm ${reached ? "font-semibold text-ink" : "text-ink-muted"}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {order.riderName && (
        <p className="mt-4 text-sm text-ink-muted">
          Rider: {order.riderName} · {order.riderPhone}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-border bg-surface p-3 text-sm">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between py-0.5">
            <span className="text-ink">
              {item.quantity}× {item.nameSnapshot}
            </span>
            <span className="text-ink-muted">
              GHS {((item.priceCentsSnapshot * item.quantity) / 100).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-ink">
          <span>Total</span>
          <span>GHS {(order.totalCents / 100).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
