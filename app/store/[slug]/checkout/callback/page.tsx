import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, orders } from "@/db";
import { verifyTransaction } from "@/lib/paystack";

export default async function CheckoutCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ orderId?: string; reference?: string; trxref?: string }>;
}) {
  const { slug } = await params;
  const { orderId, reference, trxref } = await searchParams;
  const txReference = reference ?? trxref ?? orderId;

  if (!orderId || !txReference) {
    return (
      <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10 text-center">
        <p className="text-ink-muted">We couldn&apos;t find that payment.</p>
        <Link
          href={`/store/${slug}`}
          className="mt-3 inline-block text-sm font-semibold text-forest underline"
        >
          Back to store
        </Link>
      </div>
    );
  }

  try {
    const transaction = await verifyTransaction(txReference);
    if (transaction.status === "success") {
      // The webhook is the authoritative confirmation (Part 2 §2 — "never
      // trust the browser redirect alone"); this just gets the buyer to a
      // "paid" tracking page immediately instead of waiting on the webhook.
      await db
        .update(orders)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }
  } catch {
    // Fall through — the webhook may still confirm payment even if this
    // synchronous verify call failed (network blip, etc).
  }

  redirect(`/track/${orderId}`);
}
