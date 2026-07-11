// Part 3 §1 — supersedes Part 1's fee-based tiers. Subscription-first,
// 0% platform fee, 30-day free trial, no card required to start.
export const PRICING_TIERS = [
  {
    key: "starter",
    name: "Starter",
    listPrice: 500,
    promoPrice: 466,
    annualPrice: 4660,
    highlighted: false,
    features: ["Up to 25 products", "Subdomain store (yourname.sella.app)", "MoMo + card checkout"],
  },
  {
    key: "growth",
    name: "Growth",
    listPrice: 1000,
    promoPrice: 933,
    annualPrice: 9330,
    highlighted: true,
    features: ["Up to 500 products", "Custom domain support", "3 staff accounts"],
  },
  {
    key: "pro",
    name: "Pro",
    listPrice: 2000,
    promoPrice: 1866,
    annualPrice: 18660,
    highlighted: false,
    features: ["Unlimited products", "Custom domain, no Sella branding", "10 staff accounts with roles"],
  },
] as const;

// Enforced limits behind the marketing copy above — kept as one source of
// truth so the pricing page and the actual enforcement in
// app/my/[slug]/actions.ts / app/my/[slug]/settings/actions.ts can't drift
// apart. `null` means unlimited.
export const PRODUCT_LIMITS: Record<string, number | null> = {
  starter: 25,
  growth: 500,
  pro: null,
};

// Starter's feature list doesn't mention staff accounts at all — it's
// owner-only, matching Part 3 §1's tier ladder (no line item = the owner is
// the only account).
export const STAFF_LIMITS: Record<string, number> = {
  starter: 1,
  growth: 3,
  pro: 10,
};
