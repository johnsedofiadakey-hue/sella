import type { Product } from "@/db/schema";
import { getMenuSection } from "@/lib/product-attributes";

// Food & Restaurant's buying flow is order-ahead, not cart-first (Part 1
// §4) — the layout leads with a scannable menu grouped by section rather
// than a product grid, since there's no "browse and compare" behaviour to
// support here.
export default function FoodMenu({ products }: { products: Product[] }) {
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
              <div key={product.id} className="flex items-center justify-between py-2.5">
                <p className="text-sm font-semibold text-ink">{product.name}</p>
                <p className="text-sm font-bold text-forest">
                  GHS {(product.priceCents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
