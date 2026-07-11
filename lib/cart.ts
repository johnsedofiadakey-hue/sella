import "server-only";
import { cookies } from "next/headers";

export type CartItem = { productId: string; quantity: number };

const CART_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days — long enough to finish an order, short enough to not linger

// No buyer accounts, ever (Part 4 §4) — the cart is just a cookie, scoped
// per tenant so browsing two stores in the same session (or on localhost,
// the same origin) never mixes carts.
function cartCookieName(tenantId: string): string {
  return `sl_cart_${tenantId}`;
}

export async function getCart(tenantId: string): Promise<CartItem[]> {
  const jar = await cookies();
  const raw = jar.get(cartCookieName(tenantId))?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.productId === "string" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

async function setCart(tenantId: string, items: CartItem[]): Promise<void> {
  const jar = await cookies();
  jar.set(cartCookieName(tenantId), JSON.stringify(items), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_TTL_SECONDS,
  });
}

export async function addToCart(tenantId: string, productId: string, quantity = 1): Promise<void> {
  const items = await getCart(tenantId);
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  await setCart(tenantId, items);
}

export async function updateCartQuantity(
  tenantId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const items = await getCart(tenantId);
  const next =
    quantity <= 0
      ? items.filter((item) => item.productId !== productId)
      : items.map((item) => (item.productId === productId ? { ...item, quantity } : item));
  await setCart(tenantId, next);
}

export async function clearCart(tenantId: string): Promise<void> {
  const jar = await cookies();
  jar.delete(cartCookieName(tenantId));
}
