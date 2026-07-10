import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/authz";
import { verifyTransaction } from "@/lib/paystack";
import { activateSubscriptionPayment } from "@/lib/billing";

export default async function BillingCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);
  const { reference, trxref } = await searchParams;
  const txReference = reference ?? trxref;

  if (txReference) {
    try {
      const transaction = await verifyTransaction(txReference);
      if (transaction.status === "success") {
        // The webhook is the authoritative confirmation (Part 2 §2); this
        // just gets the merchant to an up-to-date billing page immediately
        // instead of waiting on it.
        await activateSubscriptionPayment(tenant.id);
      }
    } catch {
      // Fall through — the webhook may still confirm it.
    }
  }

  redirect(`/my/${slug}/billing`);
}
