import { notFound } from "next/navigation";
import { getActiveProductsForTenant, getTenantBySlug, CATEGORY_LABELS } from "@/lib/tenants";
import { darkShade, lightTint } from "@/lib/color";
import ProductGrid from "@/components/storefront/ProductGrid";
import FoodMenu from "@/components/storefront/FoodMenu";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const products = await getActiveProductsForTenant(tenant.id);

  // Only two tokens are merchant-editable (Part 6 §2.3) — everything else
  // about the header, including the derived text colour, follows from them.
  const primary = tenant.themePrimaryColor;
  const headerBg = primary ? lightTint(primary) : "var(--forest-tint)";
  const headerFg = primary ? darkShade(primary) : "var(--forest-dark)";

  return (
    <div className="flex-1">
      <header className="px-6 py-10" style={{ background: headerBg }}>
        <div className="flex items-center gap-3">
          {tenant.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local upload stand-in
            <img
              src={tenant.logoUrl}
              alt={tenant.businessName}
              className="h-12 w-12 rounded-full object-cover"
            />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {CATEGORY_LABELS[tenant.category] ?? tenant.category}
            </p>
            <h1 className="mt-1 text-3xl font-bold" style={{ color: headerFg }}>
              {tenant.businessName}
            </h1>
          </div>
        </div>
        {tenant.status === "trial" && (
          <span className="mt-3 inline-block rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-ink">
            Trial store — not yet live
          </span>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {products.length === 0 ? (
          <p className="text-ink-muted">{`${tenant.businessName} hasn't added any products yet.`}</p>
        ) : tenant.category === "food" ? (
          <FoodMenu products={products} />
        ) : (
          <ProductGrid products={products} showSizes={tenant.category === "fashion"} />
        )}
      </main>
    </div>
  );
}
