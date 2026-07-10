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
