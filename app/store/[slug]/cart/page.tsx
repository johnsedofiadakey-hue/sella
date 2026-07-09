import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantBySlug, getProductsByIds } from "@/lib/tenants";
import { getCart } from "@/lib/cart";
import CartQuantityControl from "./quantity-control";

export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const cart = await getCart(tenant.id);
  const products = await getProductsByIds(
    tenant.id,
    cart.map((item) => item.productId),
  );
  const productById = new Map(products.map((p) => [p.id, p]));

  const lines = cart
    .map((item) => {
      const product = productById.get(item.productId);
      return product ? { product, quantity: item.quantity } : null;
    })
    .filter((line) => line !== null);

  const total = lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href={`/store/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Your cart</h1>

      {lines.length === 0 ? (
        <p className="mt-4 text-ink-muted">Your cart is empty.</p>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {lines.map(({ product, quantity }) => (
              <li
                key={product.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-forest-tint">
                  {product.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element -- local upload stand-in
                    <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ink">{product.name}</p>
                  <p className="text-sm text-forest">
                    GHS {(product.priceCents / 100).toFixed(2)}
                  </p>
                </div>
                <CartQuantityControl slug={slug} productId={product.id} quantity={quantity} />
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <p className="font-semibold text-ink">Total</p>
            <p className="text-lg font-bold text-forest-dark">GHS {(total / 100).toFixed(2)}</p>
          </div>
          <Link
            href={`/store/${slug}/checkout`}
            className="mt-4 block rounded-full bg-gold px-4 py-2.5 text-center text-sm font-semibold text-gold-ink"
          >
            Checkout
          </Link>
        </>
      )}
    </div>
  );
}
