"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, orders } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { verifySecret } from "@/lib/crypto";

// TODO: Meta WhatsApp Business Cloud API, per Part 4 §2 ("one-tap dispatch
// ... the message IS the dispatch system"). Same console stand-in pattern
// as OTP delivery until that account exists (Part 5 Phase 0).
async function dispatchToRider(riderPhone: string, orderId: string) {
  console.log(`[dispatch] rider ${riderPhone} -> order ${orderId}`);
}

export async function confirmOrder(slug: string, orderId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db
    .update(orders)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/orders`);
}

export async function markPickedUp(slug: string, orderId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db
    .update(orders)
    .set({
      status: "delivered",
      paymentStatus: "paid",
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/orders`);
}

export async function assignRider(
  slug: string,
  orderId: string,
  riderName: string,
  riderPhone: string,
) {
  const { tenant } = await requireTenantMember(slug);
  if (!riderName.trim() || !riderPhone.trim()) {
    return { error: "Enter the rider's name and phone." };
  }

  await db
    .update(orders)
    .set({
      status: "out_for_delivery",
      riderName: riderName.trim(),
      riderPhone: riderPhone.trim(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenant.id)));

  await dispatchToRider(riderPhone.trim(), orderId);
  revalidatePath(`/my/${slug}/orders`);
}

// Proof-of-delivery per Part 4 §2 — the rider asks the buyer for the code
// at handover; entering it here is what actually flips the order, not a
// merchant rubber stamp.
export async function markDelivered(slug: string, orderId: string, otp: string) {
  const { tenant } = await requireTenantMember(slug);

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.tenantId, tenant.id)),
  });
  if (!order) return { error: "Order not found." };
  if (!order.deliveryOtpHash) return { error: "This order has no delivery code to check." };
  if (!verifySecret(otp.trim(), order.deliveryOtpHash)) return { error: "That code doesn't match." };

  await db
    .update(orders)
    .set({
      status: "delivered",
      paymentStatus: "paid",
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
  revalidatePath(`/my/${slug}/orders`);
}
