"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, disputes, orders } from "@/db";
import { requireStaff } from "@/lib/authz";

export async function ruleOnDispute(
  disputeId: string,
  ruling: "refund" | "replacement" | "rejected",
  resolutionNote: string,
) {
  const { session } = await requireStaff();
  if (!resolutionNote.trim()) return { error: "Enter a resolution note." };

  const dispute = await db.query.disputes.findFirst({ where: eq(disputes.id, disputeId) });
  if (!dispute) return { error: "Dispute not found." };

  const status =
    ruling === "refund"
      ? "resolved_refund"
      : ruling === "replacement"
        ? "resolved_replacement"
        : "resolved_rejected";

  await db
    .update(disputes)
    .set({
      status,
      resolution: resolutionNote.trim(),
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
    })
    .where(eq(disputes.id, disputeId));

  if (ruling === "refund") {
    // Real Paystack-paid orders would call the Refunds API here (Part 2
    // §2) — dormant until live credentials exist, same as checkout.
    await db
      .update(orders)
      .set({ paymentStatus: "refunded", updatedAt: new Date() })
      .where(eq(orders.id, dispute.orderId));
  }

  revalidatePath("/mission-control/disputes");
}
