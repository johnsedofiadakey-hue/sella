import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, kycDocuments, type KycDocument } from "@/db";

// A merchant can resubmit after a rejection, so this table accumulates
// history per type rather than one row each — callers want the most
// recent submission per type, not every attempt.
export async function getLatestKycDocuments(
  tenantId: string,
): Promise<Map<string, KycDocument>> {
  const docs = await db.query.kycDocuments.findMany({
    where: eq(kycDocuments.tenantId, tenantId),
    orderBy: [desc(kycDocuments.createdAt)],
  });

  const latestByType = new Map<string, KycDocument>();
  for (const doc of docs) {
    if (!latestByType.has(doc.type)) latestByType.set(doc.type, doc);
  }
  return latestByType;
}

// Part 2 §3's verification levels — what each approved doc type unlocks.
export const KYC_LEVEL_BY_DOC_TYPE: Record<string, number> = {
  ghana_card: 1,
  momo_match: 1,
  business_registration: 2,
};
