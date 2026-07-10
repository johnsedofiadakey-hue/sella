import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getActiveProductsForTenant, getTenantBySlug, getSubscriptionForTenant, CATEGORY_LABELS } from "@/lib/tenants";
import { darkShade, lightTint } from "@/lib/color";
import { getCart } from "@/lib/cart";
import { getBillingState } from "@/lib/billing";
import { recordStoreVisit } from "@/lib/analytics";
import ProductGrid from "@/components/storefront/ProductGrid";
import FoodMenu from "@/components/storefront/FoodMenu";
import ListingGrid from "@/components/storefront/ListingGrid";

// Automobile and Beauty/Services are enquiry/booking verticals — no cart
// at all (Part 1 §4), so the cart link in the header only makes sense
// for every other category.
const NO_CART_CATEGORIES = new Set(["automobile", "beauty_services"]);

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  // Recorded after the response is sent (Next's `after`) so a visit never
  // adds latency to the page a buyer is waiting on.
  after(() => recordStoreVisit(tenant.id));

  const subscription = await getSubscriptionForTenant(tenant.id);
  const billing = getBillingState(subscription);

  // Part 3 §1: the store pauses — never a broken link or a deleted store —
  // once the trial and its grace period both lapse unpaid.
  if (billing.phase === "paused") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {tenant.businessName}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-forest-dark">
          This store is temporarily closed.
        </h1>
        <p className="mt-2 text-sm text-ink-muted">Please check back soon.</p>
      </div>
    );
  }

  const products = await getActiveProductsForTenant(tenant.id);
  const cart = await getCart(tenant.id);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Only two tokens are merchant-editable (Part 6 §2.3) — everything else
  // about the header, including the derived text colour, follows from them.
  const primary = tenant.themePrimaryColor;
  const headerBg = primary ? lightTint(primary) : "var(--forest-tint)";
  const headerFg = primary ? darkShade(primary) : "var(--forest-dark)";

  return (
    <div className="flex-1">
      <header className="px-6 py-10" style={{ background: headerBg }}>
        <div className="flex items-start justify-between gap-3">
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
          {!NO_CART_CATEGORIES.has(tenant.category) && (
            <Link
              href={`/store/${slug}/cart`}
              className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm"
            >
              Cart{cartCount > 0 ? ` · ${cartCount}` : ""}
            </Link>
          )}
        </div>
        {(billing.phase === "trial" || billing.phase === "grace") && (
          <span className="mt-3 inline-block rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-ink">
            Trial store — not yet live
          </span>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {products.length === 0 ? (
          <p className="text-ink-muted">{`${tenant.businessName} hasn't added any products yet.`}</p>
        ) : tenant.category === "food" ? (
          <FoodMenu slug={slug} products={products} />
        ) : tenant.category === "automobile" ? (
          <ListingGrid slug={slug} products={products} mode="enquire" />
        ) : tenant.category === "beauty_services" ? (
          <ListingGrid slug={slug} products={products} mode="book" />
        ) : (
          <ProductGrid slug={slug} products={products} showSizes={tenant.category === "fashion"} />
        )}
      </main>
    </div>
  );
}
