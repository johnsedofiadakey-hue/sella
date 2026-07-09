import type { Product } from "@/db/schema";

// Vertical templates read the same jsonb column differently rather than
// forking the schema per category — Part 6 §3's "configuration, not a new
// product" rule, applied to product data instead of just storefront theme.

export function getSizes(product: Pick<Product, "attributes">): string[] {
  const raw = product.attributes as Record<string, unknown> | null;
  const sizes = raw?.sizes;
  return Array.isArray(sizes) ? sizes.filter((s): s is string => typeof s === "string") : [];
}

export function getMenuSection(product: Pick<Product, "attributes">): string {
  const raw = product.attributes as Record<string, unknown> | null;
  const section = raw?.section;
  return typeof section === "string" && section.trim() ? section.trim() : "Menu";
}
