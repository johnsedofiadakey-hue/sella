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

// Groceries & Fresh Produce and Laundry & Home Services both price "per
// something" rather than per item (Part 1 §4 / Part 2 §4) — same field,
// read by two different verticals rather than forked per category.
export function getUnit(product: Pick<Product, "attributes">): string | null {
  const raw = product.attributes as Record<string, unknown> | null;
  const unit = raw?.unit;
  return typeof unit === "string" && unit.trim() ? unit.trim() : null;
}

// Electronics & Phones condition label (Part 1 §4).
export function getCondition(product: Pick<Product, "attributes">): string | null {
  const raw = product.attributes as Record<string, unknown> | null;
  const condition = raw?.condition;
  return typeof condition === "string" && condition.trim() ? condition.trim() : null;
}

export const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  uk_used: "UK-used",
};

export function getWarranty(product: Pick<Product, "attributes">): string | null {
  const raw = product.attributes as Record<string, unknown> | null;
  const warranty = raw?.warranty;
  return typeof warranty === "string" && warranty.trim() ? warranty.trim() : null;
}

export type Spec = { label: string; value: string };

// Automobile and Electronics both need a full spec table (Part 1 §4).
// Stored as an array of "Label: Value" strings rather than a nested object
// so the merchant-facing edit form is just a textarea, one spec per line.
export function getSpecs(product: Pick<Product, "attributes">): Spec[] {
  const raw = product.attributes as Record<string, unknown> | null;
  const specs = raw?.specs;
  if (!Array.isArray(specs)) return [];
  return specs
    .filter((s): s is string => typeof s === "string")
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return { label: label.trim(), value: rest.join(":").trim() };
    })
    .filter((spec) => spec.label && spec.value);
}

export function parseSpecsInput(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"));
}

export function formatSpecsForEdit(product: Pick<Product, "attributes">): string {
  return getSpecs(product)
    .map((spec) => `${spec.label}: ${spec.value}`)
    .join("\n");
}

// Automobile per Part 1 §4: "price-on-request option." priceCents still
// holds a real number (nothing downstream can divide by null), but the
// storefront and detail page show "Price on request" instead of it.
export function isPriceOnRequest(product: Pick<Product, "attributes">): boolean {
  const raw = product.attributes as Record<string, unknown> | null;
  return raw?.priceOnRequest === true;
}

// Beauty, Salon & Services: booking duration in minutes (Part 1 §4).
export function getServiceDurationMins(product: Pick<Product, "attributes">): number | null {
  const raw = product.attributes as Record<string, unknown> | null;
  const mins = raw?.durationMins;
  return typeof mins === "number" && Number.isFinite(mins) && mins > 0 ? mins : null;
}

// Digital Products & Courses: the file the buyer downloads once paid
// (Part 1 §4 — "upload-and-sell files ... automatic delivery link").
export function getFileUrl(product: Pick<Product, "attributes">): string | null {
  const raw = product.attributes as Record<string, unknown> | null;
  const fileUrl = raw?.fileUrl;
  return typeof fileUrl === "string" && fileUrl.trim() ? fileUrl.trim() : null;
}
