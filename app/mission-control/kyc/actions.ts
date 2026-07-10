"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, kycDocuments, tenants } from "@/db";
import { requireStaff } from "@/lib/authz";
import { KYC_LEVEL_BY_DOC_TYPE } from "@/lib/kyc";

export async function approveKycDocument(docId: string) {
  const { session } = await requireStaff();

  const doc = await db.query.kycDocuments.findFirst({ where: eq(kycDocuments.id, docId) });
  if (!doc) return { error: "Document not found." };

  await db
    .update(kycDocuments)
    .set({ status: "approved", reviewedBy: session.user.id, reviewedAt: new Date() })
    .where(eq(kycDocuments.id, docId));

  const unlockedLevel = KYC_LEVEL_BY_DOC_TYPE[doc.type] ?? 0;
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, doc.tenantId) });
  if (tenant && unlockedLevel > tenant.kycLevel) {
    await db
      .update(tenants)
      .set({ kycLevel: unlockedLevel, updatedAt: new Date() })
      .where(eq(tenants.id, tenant.id));
  }

  revalidatePath("/mission-control/kyc");
}

export async function rejectKycDocument(docId: string, reason: string) {
  const { session } = await requireStaff();
  if (!reason.trim()) return { error: "Enter a reason." };

  await db
    .update(kycDocuments)
    .set({
      status: "rejected",
      rejectionReason: reason.trim(),
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(kycDocuments.id, docId));

  revalidatePath("/mission-control/kyc");
}
