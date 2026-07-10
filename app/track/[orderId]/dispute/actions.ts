"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, orders, disputes } from "@/db";
import { normalizePhone } from "@/lib/phone";

const disputeSchema = z.object({
  phone: z.string().min(6, "Enter the phone number used for this order."),
  reason: z.enum(["not_received", "not_as_described", "wrong_item", "refund_refused", "other"]),
  description: z.string().trim().min(10, "Say a bit more about what happened."),
});

export async function openDispute(orderId: string, formData: FormData) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return { error: "Order not found." };
  if (order.status === "disputed") return { error: "A dispute is already open for this order." };

  const parsed = disputeSchema.safeParse({
    phone: formData.get("phone"),
    reason: formData.get("reason"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Lightweight buyer verification for a rare, low-stakes action — not a
  // full OTP round-trip, just confirming the requester knows the phone
  // number on file for this order (Part 2 §6: "just the order code and
  // phone verification").
  if (normalizePhone(parsed.data.phone) !== normalizePhone(order.buyerPhone)) {
    return { error: "That phone number doesn't match this order." };
  }

  const respondByAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.insert(disputes).values({
    orderId: order.id,
    tenantId: order.tenantId,
    reason: parsed.data.reason,
    description: parsed.data.description,
    respondByAt,
  });

  await db
    .update(orders)
    .set({ status: "disputed", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  redirect(`/track/${orderId}`);
}
