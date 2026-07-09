"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantBySlug, getProductsByIds } from "@/lib/tenants";
import { getCart, clearCart } from "@/lib/cart";
import { db, orders, orderItems } from "@/db";
import { hashSecret } from "@/lib/crypto";

const checkoutSchema = z.object({
  buyerName: z.string().trim().min(2, "Enter your name."),
  buyerPhone: z.string().trim().min(6, "Enter a valid phone number."),
  fulfillmentType: z.enum(["pickup", "delivery"]),
  deliveryArea: z.string().trim().optional(),
  deliveryLandmark: z.string().trim().optional(),
  deliveryGpsCode: z.string().trim().optional(),
});

export async function placeOrder(slug: string, formData: FormData) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { error: "Store not found." };

  const parsed = checkoutSchema.safeParse({
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone"),
    fulfillmentType: formData.get("fulfillmentType"),
    deliveryArea: formData.get("deliveryArea") ?? undefined,
    deliveryLandmark: formData.get("deliveryLandmark") ?? undefined,
    deliveryGpsCode: formData.get("deliveryGpsCode") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { fulfillmentType, deliveryArea, deliveryLandmark, deliveryGpsCode } = parsed.data;
  if (fulfillmentType === "delivery" && (!deliveryArea || !deliveryLandmark)) {
    return { error: "Enter your area and a landmark for delivery." };
  }

  const cart = await getCart(tenant.id);
  if (cart.length === 0) return { error: "Your cart is empty." };

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
  if (lines.length === 0) return { error: "Those items are no longer available." };

  const totalCents = lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);

  // Proof-of-delivery code (Part 4 §2) — only the hash is stored; the buyer
  // sees the plaintext once, right now, the same way a paper receipt would
  // show it. There is deliberately no way to look it up again later.
  const deliveryOtp = fulfillmentType === "delivery" ? String(randomInt(1000, 10000)) : null;

  const [order] = await db
    .insert(orders)
    .values({
      tenantId: tenant.id,
      buyerName: parsed.data.buyerName,
      buyerPhone: parsed.data.buyerPhone,
      fulfillmentType,
      deliveryArea: deliveryArea || null,
      deliveryLandmark: deliveryLandmark || null,
      deliveryGpsCode: deliveryGpsCode || null,
      totalCents,
      paymentStatus: "pending",
      deliveryOtpHash: deliveryOtp ? hashSecret(deliveryOtp) : null,
    })
    .returning();

  await db.insert(orderItems).values(
    lines.map((line) => ({
      orderId: order.id,
      productId: line.product.id,
      nameSnapshot: line.product.name,
      priceCentsSnapshot: line.product.priceCents,
      quantity: line.quantity,
    })),
  );

  await clearCart(tenant.id);

  redirect(`/track/${order.id}${deliveryOtp ? `?otp=${deliveryOtp}` : ""}`);
}
