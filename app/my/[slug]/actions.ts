"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, products, tenants } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { saveUploadedImage, saveUploadedFile } from "@/lib/storage";
import { parseSpecsInput } from "@/lib/product-attributes";
import { getSubscriptionForTenant } from "@/lib/tenants";
import { PRODUCT_LIMITS } from "@/lib/pricing";

async function extractPhotoUrl(
  tenantId: string,
  formData: FormData,
  field: string,
): Promise<string | null> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  return saveUploadedImage(tenantId, file);
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name.").max(120),
  priceGhs: z.coerce.number().positive("Enter a valid price."),
  stock: z.string().optional(),
  // Fashion sizes (JSON-encoded string[]) and Food menu section — read
  // only when the tenant's category calls for them; see product-form.tsx.
  sizes: z.string().optional(),
  section: z.string().trim().max(60).optional(),
  unit: z.string().trim().max(20).optional(),
  condition: z.string().trim().max(20).optional(),
  warranty: z.string().trim().max(120).optional(),
  specs: z.string().optional(),
  priceOnRequest: z.string().optional(),
  durationMins: z.string().optional(),
});

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    priceGhs: formData.get("priceGhs"),
    stock: formData.get("stock") ?? undefined,
    sizes: formData.get("sizes") ?? undefined,
    section: formData.get("section") ?? undefined,
    unit: formData.get("unit") ?? undefined,
    condition: formData.get("condition") ?? undefined,
    warranty: formData.get("warranty") ?? undefined,
    specs: formData.get("specs") ?? undefined,
    priceOnRequest: formData.get("priceOnRequest") ?? undefined,
    durationMins: formData.get("durationMins") ?? undefined,
  });
}

// Shared by addProduct and editProduct so the two save paths can't drift
// on which category-specific fields end up in `attributes`.
function buildAttributes(
  data: z.infer<typeof productSchema>,
  fileUrl: string | null,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  if (data.sizes) {
    try {
      const sizes = JSON.parse(data.sizes);
      if (Array.isArray(sizes) && sizes.every((s) => typeof s === "string") && sizes.length > 0) {
        attributes.sizes = sizes;
      }
    } catch {
      // Malformed sizes payload — silently drop rather than fail the whole save.
    }
  }
  if (data.section) attributes.section = data.section;
  if (data.unit) attributes.unit = data.unit;
  if (data.condition) attributes.condition = data.condition;
  if (data.warranty) attributes.warranty = data.warranty;
  if (data.specs) {
    const specs = parseSpecsInput(data.specs);
    if (specs.length > 0) attributes.specs = specs;
  }
  if (data.priceOnRequest === "true") attributes.priceOnRequest = true;
  if (data.durationMins) {
    const mins = Number.parseInt(data.durationMins, 10);
    if (Number.isFinite(mins) && mins > 0) attributes.durationMins = mins;
  }
  if (fileUrl) attributes.fileUrl = fileUrl;
  return attributes;
}

export async function addProduct(tenantSlug: string, formData: FormData) {
  const { tenant } = await requireTenantMember(tenantSlug);

  // Part 3 §1's tier ladder ("Up to 25/500 products") was marketing copy
  // only until now — this is the actual enforcement. Checked before any
  // file upload so an over-limit merchant doesn't pay the upload cost for
  // a save that's about to be rejected anyway.
  const subscription = await getSubscriptionForTenant(tenant.id);
  const tier = subscription?.tier ?? "starter";
  const limit = PRODUCT_LIMITS[tier] ?? null;
  if (limit !== null) {
    const existing = await db.query.products.findMany({
      where: eq(products.tenantId, tenant.id),
      columns: { id: true },
    });
    if (existing.length >= limit) {
      return {
        error: `You've reached the ${limit}-product limit on your current plan. Upgrade for more room.`,
      };
    }
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let photoUrl: string | null;
  let fileUrl: string | null = null;
  try {
    photoUrl = await extractPhotoUrl(tenant.id, formData, "photo");
    if (tenant.category === "digital_products") {
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return { error: "Upload the file buyers will receive after payment." };
      }
      fileUrl = await saveUploadedFile(tenant.id, file);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the upload." };
  }

  const stockValue = parsed.data.stock ? Number.parseInt(parsed.data.stock, 10) : null;

  await db.insert(products).values({
    tenantId: tenant.id,
    name: parsed.data.name,
    priceCents: Math.round(parsed.data.priceGhs * 100),
    images: photoUrl ? [photoUrl] : [],
    stock: stockValue !== null && Number.isFinite(stockValue) ? stockValue : null,
    attributes: buildAttributes(parsed.data, fileUrl),
  });

  revalidatePath(`/my/${tenantSlug}`);
  redirect(`/my/${tenantSlug}`);
}

// Merchants previously had to delete and recreate a listing to fix a typo
// or swap a photo, losing its order-history association in the process.
export async function editProduct(tenantSlug: string, productId: string, formData: FormData) {
  const { tenant } = await requireTenantMember(tenantSlug);

  const existing = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.tenantId, tenant.id)),
  });
  if (!existing) return { error: "Product not found." };

  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existingAttributes = existing.attributes as Record<string, unknown>;
  let photoUrl = existing.images[0] ?? null;
  let fileUrl = typeof existingAttributes.fileUrl === "string" ? existingAttributes.fileUrl : null;
  try {
    const uploadedPhoto = await extractPhotoUrl(tenant.id, formData, "photo");
    if (uploadedPhoto) photoUrl = uploadedPhoto;
    if (tenant.category === "digital_products") {
      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        fileUrl = await saveUploadedFile(tenant.id, file);
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the upload." };
  }

  const stockValue = parsed.data.stock ? Number.parseInt(parsed.data.stock, 10) : null;

  await db
    .update(products)
    .set({
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.priceGhs * 100),
      images: photoUrl ? [photoUrl] : [],
      stock: stockValue !== null && Number.isFinite(stockValue) ? stockValue : null,
      attributes: buildAttributes(parsed.data, fileUrl),
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.tenantId, tenant.id)));

  revalidatePath(`/my/${tenantSlug}`);
  redirect(`/my/${tenantSlug}`);
}

export async function toggleProductActive(
  tenantSlug: string,
  productId: string,
  isActive: boolean,
) {
  const { tenant } = await requireTenantMember(tenantSlug);
  await db
    .update(products)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.tenantId, tenant.id)));
  revalidatePath(`/my/${tenantSlug}`);
}

export async function deleteProduct(tenantSlug: string, productId: string) {
  const { tenant } = await requireTenantMember(tenantSlug);
  await db.delete(products).where(and(eq(products.id, productId), eq(products.tenantId, tenant.id)));
  revalidatePath(`/my/${tenantSlug}`);
}

// Theme colours are the two tokens a merchant can set (Part 6 §2.3) — font,
// spacing, and everything else stay fixed regardless of tier. Business name
// isn't a theme token, but it lives on the same settings page and the same
// row, so it's validated and saved alongside them rather than as a second
// round trip.
const brandingSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name.").max(120),
  themePrimaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour."),
  themeAccentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour."),
});

export async function updateBranding(tenantSlug: string, formData: FormData) {
  const { tenant } = await requireTenantMember(tenantSlug);

  const parsed = brandingSchema.safeParse({
    businessName: formData.get("businessName"),
    themePrimaryColor: formData.get("themePrimaryColor"),
    themeAccentColor: formData.get("themeAccentColor"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let logoUrl: string | null = tenant.logoUrl;
  try {
    const uploaded = await extractPhotoUrl(tenant.id, formData, "logo");
    if (uploaded) logoUrl = uploaded;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save logo." };
  }

  await db
    .update(tenants)
    .set({
      businessName: parsed.data.businessName,
      themePrimaryColor: parsed.data.themePrimaryColor,
      themeAccentColor: parsed.data.themeAccentColor,
      logoUrl,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id));

  revalidatePath(`/my/${tenantSlug}`);
  revalidatePath(`/store/${tenantSlug}`);
  redirect(`/my/${tenantSlug}`);
}
