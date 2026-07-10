import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, tenants, products, subscriptions } from "@/db";

export async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
}

export async function getSubscriptionForTenant(tenantId: string) {
  return db.query.subscriptions.findFirst({ where: eq(subscriptions.tenantId, tenantId) });
}

// Cart/checkout re-fetch product rows by id rather than trusting anything
// stored client-side — prices always come from the DB at checkout time.
export async function getProductsByIds(tenantId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db.query.products.findMany({
    where: and(eq(products.tenantId, tenantId), inArray(products.id, ids)),
  });
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

// Re-exported for existing call sites — the data itself lives in
// lib/categories.ts (no "server-only", so client components like the
// create-store form and the marketing site can import it directly).
export { CATEGORY_LABELS } from "./categories";
