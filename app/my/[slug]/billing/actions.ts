"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireTenantMember } from "@/lib/authz";
import { getSubscriptionForTenant } from "@/lib/tenants";
import { initializeTransaction } from "@/lib/paystack";

// Part 3 §1's promo pricing — GHS, converted to pesewas at the call site.
const TIER_PRICE_PESEWAS: Record<string, number> = {
  starter: 46_600,
  growth: 93_300,
  pro: 186_600,
};

export async function payNow(slug: string) {
  const { session, tenant } = await requireTenantMember(slug);
  const subscription = await getSubscriptionForTenant(tenant.id);
  const tier = subscription?.tier ?? "starter";

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  // initializeTransaction is a real network call, so it must stay inside
  // try/catch — redirect() below must not, since it works by throwing.
  let authorizationUrl: string;
  try {
    const transaction = await initializeTransaction({
      email: `${session.user.phone.replace(/[^0-9]/g, "")}@merchant.shoplocal.app`,
      amountPesewas: TIER_PRICE_PESEWAS[tier] ?? TIER_PRICE_PESEWAS.starter,
      // Prefixed so the webhook can tell a subscription payment apart from
      // an order payment (which uses the bare order id as its reference).
      reference: `sub_${tenant.id}_${Date.now()}`,
      // No subaccount — this is StormGlide's own subscription revenue,
      // not a merchant sale, so it settles to the platform account.
      callbackUrl: `${origin}/my/${slug}/billing/callback`,
      metadata: { tenantId: tenant.id, purpose: "subscription", tier },
    });
    authorizationUrl = transaction.authorization_url;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start payment." };
  }

  redirect(authorizationUrl);
}
