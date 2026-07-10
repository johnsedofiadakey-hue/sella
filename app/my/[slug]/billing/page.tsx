import Link from "next/link";
import { requireTenantMember } from "@/lib/authz";
import { getSubscriptionForTenant } from "@/lib/tenants";
import { getBillingState } from "@/lib/billing";
import { isPaystackConfigured } from "@/lib/paystack";
import PayNowButton from "./pay-now-button";

const TIER_LABELS: Record<string, string> = { starter: "Starter", growth: "Growth", pro: "Pro" };
const TIER_PRICE_GHS: Record<string, number> = { starter: 466, growth: 933, pro: 1866 };

export default async function BillingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);
  const subscription = await getSubscriptionForTenant(tenant.id);
  const billing = getBillingState(subscription);
  const tier = subscription?.tier ?? "starter";
  const paystackReady = isPaystackConfigured();

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Billing</h1>

      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {TIER_LABELS[tier] ?? tier} plan
        </p>
        <p className="mt-1 text-2xl font-bold text-forest-dark">
          GHS {TIER_PRICE_GHS[tier] ?? TIER_PRICE_GHS.starter}
          <span className="text-sm font-normal text-ink-muted">/month</span>
        </p>

        {billing.phase === "trial" && (
          <p className="mt-2 text-sm text-forest">
            {billing.daysRemaining} day{billing.daysRemaining === 1 ? "" : "s"} left in your free
            trial.
          </p>
        )}
        {billing.phase === "grace" && (
          <p className="mt-2 text-sm text-danger">
            Your trial ended. Pay within {billing.daysRemaining} day
            {billing.daysRemaining === 1 ? "" : "s"} to keep your store live.
          </p>
        )}
        {billing.phase === "paused" && (
          <p className="mt-2 text-sm text-danger">
            Your store is paused. Pay now to bring it back online — your data is safe.
          </p>
        )}
        {billing.phase === "active" && subscription?.currentPeriodEnd && (
          <p className="mt-2 text-sm text-ink-muted">
            Renews{" "}
            {subscription.currentPeriodEnd.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            .
          </p>
        )}
      </div>

      {billing.phase !== "active" &&
        (paystackReady ? (
          <PayNowButton slug={slug} />
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Online payment isn&apos;t available yet — Sella&apos;s payment provider account is
            still being set up.
          </p>
        ))}
    </div>
  );
}
