import "server-only";
import { and, eq } from "drizzle-orm";
import { db, tenants, products } from "@/db";

export async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

// Public storefront — only what the merchant has chosen to show.
export async function getActiveProductsForTenant(tenantId: string) {
  return db.query.products.findMany({
    where: and(eq(products.tenantId, tenantId), eq(products.isActive, true)),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
}

// Portal product management — everything, including hidden items, so a
// merchant can find and re-show something they toggled off.
export async function getAllProductsForTenant(tenantId: string) {
  return db.query.products.findMany({
    where: eq(products.tenantId, tenantId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
}

// Human-readable label for the category enum — Part 1 §4's eight verticals,
// plus laundry from Part 2 §4. Vertical-specific layouts land per template
// as the storefront build reaches them (Part 5, Months 2-3 and 5-8).
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
