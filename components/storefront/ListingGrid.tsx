import Link from "next/link";
import type { Product } from "@/db/schema";
import { isPriceOnRequest, getServiceDurationMins } from "@/lib/product-attributes";

// Automobile ("enquiry & lead-gen, not cart") and Beauty/Services
// ("booking, not shipping") per Part 1 §4 — neither has an add-to-cart
// button, so this is a deliberately separate component from ProductGrid
// rather than that grid with a prop toggled off.
export default function ListingGrid({
  slug,
  products,
  mode,
}: {
  slug: string;
  products: Product[];
  mode: "enquire" | "book";
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((product) => {
        const onRequest = mode === "enquire" && isPriceOnRequest(product);
        const durationMins = mode === "book" ? getServiceDurationMins(product) : null;
        return (
          <Link
            key={product.id}
            href={`/store/${slug}/p/${product.id}`}
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
                {onRequest ? "Price on request" : `GHS ${(product.priceCents / 100).toFixed(2)}`}
              </p>
              {durationMins && <p className="text-xs text-ink-muted">{durationMins} min</p>}
              <span className="mt-1.5 inline-block rounded-full bg-gold px-2 py-1 text-[11px] font-semibold text-gold-ink">
                {mode === "enquire" ? "View & enquire" : "View & book"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
