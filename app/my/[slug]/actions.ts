"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, products, tenants } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { saveUploadedImage, saveUploadedFile } from "@/lib/storage";
import { parseSpecsInput } from "@/lib/product-attributes";

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

export async function addProduct(tenantSlug: string, formData: FormData) {
  const { tenant } = await requireTenantMember(tenantSlug);

  const parsed = productSchema.safeParse({
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

  const attributes: Record<string, unknown> = {};
  if (parsed.data.sizes) {
    try {
      const sizes = JSON.parse(parsed.data.sizes);
      if (Array.isArray(sizes) && sizes.every((s) => typeof s === "string") && sizes.length > 0) {
        attributes.sizes = sizes;
      }
    } catch {
      // Malformed sizes payload — silently drop rather than fail the whole save.
    }
  }
  if (parsed.data.section) attributes.section = parsed.data.section;
  if (parsed.data.unit) attributes.unit = parsed.data.unit;
  if (parsed.data.condition) attributes.condition = parsed.data.condition;
  if (parsed.data.warranty) attributes.warranty = parsed.data.warranty;
  if (parsed.data.specs) {
    const specs = parseSpecsInput(parsed.data.specs);
    if (specs.length > 0) attributes.specs = specs;
  }
  if (parsed.data.priceOnRequest === "true") attributes.priceOnRequest = true;
  if (parsed.data.durationMins) {
    const mins = Number.parseInt(parsed.data.durationMins, 10);
    if (Number.isFinite(mins) && mins > 0) attributes.durationMins = mins;
  }
  if (fileUrl) attributes.fileUrl = fileUrl;

  await db.insert(products).values({
    tenantId: tenant.id,
    name: parsed.data.name,
    priceCents: Math.round(parsed.data.priceGhs * 100),
    images: photoUrl ? [photoUrl] : [],
    stock: stockValue !== null && Number.isFinite(stockValue) ? stockValue : null,
    attributes,
  });

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

// Only the two tokens a merchant can set — Part 6 §2.3. Font, spacing, and
// everything else stay fixed regardless of tier.
const brandingSchema = z.object({
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
