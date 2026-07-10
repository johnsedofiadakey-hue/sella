"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, riders } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { saveRider } from "@/lib/riders";

export async function addRider(slug: string, formData: FormData) {
  const { tenant } = await requireTenantMember(slug);
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return { error: "Enter the rider's name and phone." };

  await saveRider(tenant.id, name, phone);
  revalidatePath(`/my/${slug}/riders`);
}

export async function deleteRider(slug: string, riderId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db.delete(riders).where(and(eq(riders.id, riderId), eq(riders.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/riders`);
}
