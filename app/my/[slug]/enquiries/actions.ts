"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, enquiries } from "@/db";
import { requireTenantMember } from "@/lib/authz";

export async function markEnquiryContacted(slug: string, enquiryId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db
    .update(enquiries)
    .set({ status: "contacted" })
    .where(and(eq(enquiries.id, enquiryId), eq(enquiries.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/enquiries`);
}

export async function closeEnquiry(slug: string, enquiryId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db
    .update(enquiries)
    .set({ status: "closed" })
    .where(and(eq(enquiries.id, enquiryId), eq(enquiries.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/enquiries`);
}
