import { notFound } from "next/navigation";
import { getActiveProductsForTenant, getTenantBySlug, CATEGORY_LABELS } from "@/lib/tenants";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const products = await getActiveProductsForTenant(tenant.id);

  return (
    <div className="flex-1">
      <header
        className="px-6 py-10"
        style={{ background: tenant.themePrimaryColor ? undefined : "var(--forest-tint)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {CATEGORY_LABELS[tenant.category] ?? tenant.category}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-forest-dark">{tenant.businessName}</h1>
        {tenant.status === "trial" && (
          <span className="mt-3 inline-block rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-ink">
            Trial store — not yet live
          </span>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {products.length === 0 ? (
          <p className="text-ink-muted">
            {tenant.businessName} hasn&apos;t added any products yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div className="aspect-square bg-forest-tint" />
                <div className="p-3">
                  <p className="text-sm font-semibold text-ink">{product.name}</p>
                  <p className="text-sm font-bold text-forest">
                    GHS {(product.priceCents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
