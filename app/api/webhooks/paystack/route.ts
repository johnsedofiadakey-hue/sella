import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, orders } from "@/db";
import { verifyWebhookSignature } from "@/lib/paystack";
import { activateSubscriptionPayment } from "@/lib/billing";

// Part 2 §2: "Never trust the browser redirect alone" — this webhook, not
// a callback page, is the authoritative source for flipping an order to
// paid or a subscription to active. Verification is over the raw request
// body, so this reads text() rather than json() before parsing.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference: string | undefined = event.data?.reference;
    const tenantId: string | undefined = event.data?.metadata?.tenantId;

    if (reference?.startsWith("sub_") && tenantId) {
      // Subscription payment (checkout/actions.ts uses the bare order id
      // as its reference, never this prefix, so the two never collide).
      await activateSubscriptionPayment(tenantId);
    } else if (reference) {
      // Defense in depth: not currently exploitable (Paystack's hosted
      // checkout only ever lets a buyer pay the amount initializeTransaction
      // set), but a mismatched amount here would mean something upstream —
      // a reference collision, an amount bug — is wrong, so don't silently
      // mark it paid.
      const order = await db.query.orders.findFirst({ where: eq(orders.id, reference) });
      const paidAmount: number | undefined = event.data?.amount;
      if (order && paidAmount === order.totalCents) {
        // Idempotent to run twice if both this webhook and the callback
        // page fire for the same order.
        await db
          .update(orders)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(eq(orders.id, reference));
      } else if (order) {
        console.error(
          `[paystack webhook] amount mismatch on order ${reference}: paid ${paidAmount}, expected ${order.totalCents}`,
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
