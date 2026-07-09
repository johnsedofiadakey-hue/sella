import "server-only";
import { eq } from "drizzle-orm";
import { db, tenants } from "@/db";
import { RESERVED_SLUGS } from "./reserved-slugs";

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    // NFKD splits "é" into "e" + a combining accent mark; dropping every
    // non-ASCII byte here removes the accent without needing a Unicode
    // combining-mark range in the regex.
    .split("")
    .filter((char) => char.charCodeAt(0) < 128)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "store";
}

// First-come-first-served, per Part 2 §1 — appends -2, -3... on collision,
// including collisions with reserved platform names.
export async function uniqueTenantSlug(businessName: string): Promise<string> {
  const root = slugify(businessName);
  let candidate = root;
  let suffix = 2;
  while (
    RESERVED_SLUGS.has(candidate) ||
    (await db.query.tenants.findFirst({ where: eq(tenants.slug, candidate) }))
  ) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}
