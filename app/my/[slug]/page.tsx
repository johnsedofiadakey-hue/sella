import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireTenantMember } from "@/lib/authz";
import { getAllProductsForTenant, getSubscriptionForTenant } from "@/lib/tenants";
import {
  getMenuSection,
  getSizes,
  getUnit,
  getCondition,
  CONDITION_LABELS,
} from "@/lib/product-attributes";
import { getBillingState } from "@/lib/billing";
import { getMonthlyStoreStats } from "@/lib/analytics";
import { db, orders } from "@/db";
import { toggleProductActive, deleteProduct } from "./actions";

// Automobile (enquiries) and Beauty/Services (bookings) never generate
// cart orders (Part 1 §4), so their dashboard nav points at their own
// queues instead of the shared Orders/Riders pages.
const ENQUIRY_CATEGORY = "automobile";
const BOOKING_CATEGORY = "beauty_services";

export default async function StoreDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);
  const items = await getAllProductsForTenant(tenant.id);
  const pendingOrders = await db.query.orders.findMany({
    where: and(eq(orders.tenantId, tenant.id), eq(orders.status, "pending")),
  });
  const subscription = await getSubscriptionForTenant(tenant.id);
  const billing = getBillingState(subscription);
  const monthStats = await getMonthlyStoreStats(tenant.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      {billing.phase === "trial" && (
        <div className="mb-4 rounded-lg border border-border bg-forest-tint px-4 py-2.5 text-sm text-forest-dark">
          Your store had {monthStats.visits} visit{monthStats.visits === 1 ? "" : "s"} and{" "}
          {monthStats.orders} order{monthStats.orders === 1 ? "" : "s"} this month.{" "}
          {billing.daysRemaining} day{billing.daysRemaining === 1 ? "" : "s"} left in your free
          trial.{" "}
          <Link href={`/my/${slug}/billing`} className="font-semibold underline">
            View billing
          </Link>
        </div>
      )}
      {billing.phase === "grace" && (
        <div className="mb-4 rounded-lg border border-danger bg-forest-tint px-4 py-2.5 text-sm text-danger">
          Your trial ended — pay within {billing.daysRemaining} day
          {billing.daysRemaining === 1 ? "" : "s"} to keep your store live.{" "}
          <Link href={`/my/${slug}/billing`} className="font-semibold underline">
            Pay now
          </Link>
        </div>
      )}
      {billing.phase === "paused" && (
        <div className="mb-4 rounded-lg border border-danger bg-forest-tint px-4 py-2.5 text-sm text-danger">
          Your store is paused and not visible to buyers.{" "}
          <Link href={`/my/${slug}/billing`} className="font-semibold underline">
            Pay now to reopen
          </Link>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <Link href="/my" className="text-xs text-ink-muted underline">
            ← Your stores
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-forest-dark">{tenant.businessName}</h1>
          <p className="text-sm text-ink-muted">{tenant.slug}.sella.app</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {tenant.category === ENQUIRY_CATEGORY ? (
            <Link href={`/my/${slug}/enquiries`} className="text-sm font-semibold text-forest">
              Enquiries
            </Link>
          ) : tenant.category === BOOKING_CATEGORY ? (
            <Link href={`/my/${slug}/bookings`} className="text-sm font-semibold text-forest">
              Bookings
            </Link>
          ) : (
            <>
              <Link href={`/my/${slug}/orders`} className="text-sm font-semibold text-forest">
                Orders{pendingOrders.length > 0 ? ` · ${pendingOrders.length} new` : ""}
              </Link>
              <Link href={`/my/${slug}/riders`} className="text-sm font-semibold text-forest">
                Riders
              </Link>
            </>
          )}
          <Link href={`/my/${slug}/settings`} className="text-sm font-semibold text-forest">
            Branding
          </Link>
          <Link href={`/my/${slug}/team`} className="text-sm font-semibold text-forest">
            Team
          </Link>
          <Link href={`/my/${slug}/payouts`} className="text-sm font-semibold text-forest">
            Payouts
          </Link>
          <Link href={`/my/${slug}/verification`} className="text-sm font-semibold text-forest">
            Verification
          </Link>
          <Link href={`/my/${slug}/billing`} className="text-sm font-semibold text-forest">
            Billing
          </Link>
          <a href={`/?store=${slug}`} className="text-sm font-semibold text-forest">
            View store →
          </a>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Visits this month
          </p>
          <p className="mt-1 text-xl font-bold text-forest-dark">{monthStats.visits}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Orders this month
          </p>
          <p className="mt-1 text-xl font-bold text-forest-dark">{monthStats.orders}</p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Products
        </h2>
        <Link
          href={`/my/${slug}/new-product`}
          className="rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-gold-ink"
        >
          + Add product
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-ink-muted">No products yet — add your first one.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-forest-tint">
                {product.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element -- local upload stand-in, not a next/image-managed remote source
                  <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-ink">{product.name}</p>
                <p className="text-sm text-forest">
                  GHS {(product.priceCents / 100).toFixed(2)}
                  {getUnit(product) && ` / ${getUnit(product)}`}
                </p>
                {tenant.category === "fashion" && getSizes(product).length > 0 && (
                  <p className="text-xs text-ink-muted">{getSizes(product).join(", ")}</p>
                )}
                {tenant.category === "food" && (
                  <p className="text-xs text-ink-muted">{getMenuSection(product)}</p>
                )}
                {tenant.category === "electronics" && getCondition(product) && (
                  <p className="text-xs text-ink-muted">
                    {CONDITION_LABELS[getCondition(product)!] ?? getCondition(product)}
                  </p>
                )}
                {!product.isActive && (
                  <p className="text-xs text-ink-muted">Hidden from your store</p>
                )}
              </div>
              <Link
                href={`/my/${slug}/products/${product.id}/edit`}
                className="text-xs text-ink-muted underline"
              >
                Edit
              </Link>
              <form
                action={async () => {
                  "use server";
                  await toggleProductActive(slug, product.id, !product.isActive);
                }}
              >
                <button type="submit" className="text-xs text-ink-muted underline">
                  {product.isActive ? "Hide" : "Show"}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await deleteProduct(slug, product.id);
                }}
              >
                <button type="submit" className="text-xs text-danger underline">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
