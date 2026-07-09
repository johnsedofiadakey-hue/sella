// Plain data, no DB access — safe to import from client components (the
// create-store form) as well as server ones (storefront, marketing site).
// Part 1 §4's eight launch verticals, plus laundry from Part 2 §4.

export const CATEGORY_LABELS: Record<string, string> = {
  general_retail: "General Retail",
  fashion: "Fashion & Clothing",
  food: "Food & Restaurant",
  automobile: "Automobile",
  groceries: "Groceries & Fresh Produce",
  electronics: "Electronics & Phones",
  beauty_services: "Beauty, Salon & Services",
  digital_products: "Digital Products & Courses",
  laundry: "Laundry & Home Services",
};

// Condensed from Part 1 §4's "special features" column.
export const CATEGORY_BLURBS: Record<string, string> = {
  general_retail: "Simple catalogue, delivery or pickup, order tracking.",
  fashion: "Size variants, lookbook galleries, a new-arrivals rail.",
  food: "Menu sections, opening hours, delivery zones, WhatsApp confirmation.",
  automobile: "Full specs, photo galleries, price-on-request, test-drive booking.",
  groceries: "Weight-based pricing, saved baskets, same-day delivery windows.",
  electronics: "Spec tables, warranty info, condition labels, trade-in enquiry.",
  beauty_services: "Booking calendar, staff selection, MoMo deposits.",
  digital_products: "Instant delivery after payment, no shipping logic.",
  laundry: "Per-item pricing, pickup & delivery scheduling, status updates.",
};

export const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));
