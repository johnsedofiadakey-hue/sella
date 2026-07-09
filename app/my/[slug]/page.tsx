import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireTenantMember } from "@/lib/authz";
import { getAllProductsForTenant } from "@/lib/tenants";
import { getMenuSection, getSizes } from "@/lib/product-attributes";
import { db, orders } from "@/db";
import { toggleProductActive, deleteProduct } from "./actions";

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

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/my" className="text-xs text-ink-muted underline">
            ← Your stores
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-forest-dark">{tenant.businessName}</h1>
          <p className="text-sm text-ink-muted">{tenant.slug}.shoplocal.app</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/my/${slug}/orders`} className="text-sm font-semibold text-forest">
            Orders{pendingOrders.length > 0 ? ` · ${pendingOrders.length} new` : ""}
          </Link>
          <Link href={`/my/${slug}/settings`} className="text-sm font-semibold text-forest">
            Branding
          </Link>
          <Link href={`/my/${slug}/payouts`} className="text-sm font-semibold text-forest">
            Payouts
          </Link>
          <a href={`/?store=${slug}`} className="text-sm font-semibold text-forest">
            View store →
          </a>
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
                <p className="text-sm text-forest">GHS {(product.priceCents / 100).toFixed(2)}</p>
                {tenant.category === "fashion" && getSizes(product).length > 0 && (
                  <p className="text-xs text-ink-muted">{getSizes(product).join(", ")}</p>
                )}
                {tenant.category === "food" && (
                  <p className="text-xs text-ink-muted">{getMenuSection(product)}</p>
                )}
                {!product.isActive && (
                  <p className="text-xs text-ink-muted">Hidden from your store</p>
                )}
              </div>
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
