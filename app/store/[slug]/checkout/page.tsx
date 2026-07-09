import { notFound } from "next/navigation";
import { getTenantBySlug, getProductsByIds } from "@/lib/tenants";
import { getCart } from "@/lib/cart";
import { isPaystackConfigured } from "@/lib/paystack";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage({
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

  if (lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10 text-center">
        <p className="text-ink-muted">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-dark">Checkout</h1>
      <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm">
        {lines.map((line) => (
          <div key={line.product.id} className="flex justify-between py-0.5">
            <span className="text-ink">
              {line.quantity}× {line.product.name}
            </span>
            <span className="text-ink-muted">
              GHS {((line.product.priceCents * line.quantity) / 100).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-ink">
          <span>Total</span>
          <span>GHS {(total / 100).toFixed(2)}</span>
        </div>
      </div>
      <CheckoutForm slug={slug} paystackConfigured={isPaystackConfigured()} />
    </div>
  );
}
