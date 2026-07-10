import Link from "next/link";
import { requireTenantMember } from "@/lib/authz";
import { isPaystackConfigured, listBanks, type Bank } from "@/lib/paystack";
import PayoutForm from "./payout-form";

export default async function PayoutsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);

  const paystackReady = isPaystackConfigured();
  const alreadyLinked = Boolean(tenant.paystackSubaccountCode);

  let banks: Bank[] = [];
  let banksError: string | null = null;
  if (paystackReady && !alreadyLinked) {
    try {
      banks = await listBanks();
    } catch (err) {
      banksError = err instanceof Error ? err.message : "Could not load banks.";
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Payouts</h1>

      {!paystackReady ? (
        <p className="mt-3 text-ink-muted">
          Card and MoMo checkout aren&apos;t available yet — Sella&apos;s payment provider
          account is still being set up. Pay on delivery works today.
        </p>
      ) : alreadyLinked ? (
        <div className="mt-3 rounded-md border border-forest bg-forest-tint p-3 text-sm text-forest-dark">
          Your payout account is linked. Card and MoMo payments from your storefront settle
          directly to you.
        </div>
      ) : banksError ? (
        <p className="mt-3 text-sm text-danger">{banksError}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-muted">
            Link the account your MoMo or card sales should pay into. Sella never holds your
            money — Paystack settles directly to you.
          </p>
          <PayoutForm slug={slug} banks={banks} defaultBusinessName={tenant.businessName} />
        </>
      )}
    </div>
  );
}
