import type { Product } from "@/db/schema";
import { getMenuSection } from "@/lib/product-attributes";
import AddToCartButton from "./AddToCartButton";

// Food & Restaurant's buying flow is order-ahead, not cart-first (Part 1
// §4) — the layout leads with a scannable menu grouped by section rather
// than a product grid, since there's no "browse and compare" behaviour to
// support here.
export default function FoodMenu({ slug, products }: { slug: string; products: Product[] }) {
  const sections = new Map<string, Product[]>();
  for (const product of products) {
    const section = getMenuSection(product);
    const list = sections.get(section) ?? [];
    list.push(product);
    sections.set(section, list);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...sections.entries()].map(([section, items]) => (
        <div key={section}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {section}
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {items.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{product.name}</p>
                  <p className="text-sm font-bold text-forest">
                    GHS {(product.priceCents / 100).toFixed(2)}
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <AddToCartButton slug={slug} productId={product.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
