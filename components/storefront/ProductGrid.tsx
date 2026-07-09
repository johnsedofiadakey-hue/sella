import type { Product } from "@/db/schema";
import { getSizes } from "@/lib/product-attributes";

// General Retail's default layout, also used by Fashion & Clothing with
// size pills switched on — same component, different information per
// category (Part 6 §5.3), not a fork.
export default function ProductGrid({
  products,
  showSizes,
}: {
  products: Product[];
  showSizes: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((product) => {
        const sizes = showSizes ? getSizes(product) : [];
        return (
          <div
            key={product.id}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            <div className="aspect-square bg-forest-tint">
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element -- local upload stand-in
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-ink">{product.name}</p>
              <p className="text-sm font-bold text-forest">
                GHS {(product.priceCents / 100).toFixed(2)}
              </p>
              {sizes.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {sizes.map((size) => (
                    <span
                      key={size}
                      className="rounded-full bg-forest-tint px-1.5 py-0.5 text-[10px] font-semibold text-forest-dark"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
