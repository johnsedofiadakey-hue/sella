"use server";

import { revalidatePath } from "next/cache";
import { getTenantBySlug } from "@/lib/tenants";
import { addToCart, updateCartQuantity } from "@/lib/cart";

async function resolveTenantId(slug: string): Promise<string> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw new Error("Store not found.");
  return tenant.id;
}

export async function addItemToCart(slug: string, productId: string) {
  const tenantId = await resolveTenantId(slug);
  await addToCart(tenantId, productId, 1);
  revalidatePath(`/store/${slug}`);
  revalidatePath(`/store/${slug}/cart`);
}

export async function setItemQuantity(slug: string, productId: string, quantity: number) {
  const tenantId = await resolveTenantId(slug);
  await updateCartQuantity(tenantId, productId, quantity);
  revalidatePath(`/store/${slug}/cart`);
}
