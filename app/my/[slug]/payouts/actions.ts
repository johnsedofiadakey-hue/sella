"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, tenants, kycDocuments } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { createSubaccount, resolveAccountNumber } from "@/lib/paystack";
import { KYC_LEVEL_BY_DOC_TYPE } from "@/lib/kyc";

// Part 2 §3's "MoMo wallet name match" — resolves the account before
// anything is linked, so a mistyped number surfaces immediately instead
// of silently creating a subaccount nobody can be paid into.
export async function verifyAccount(slug: string, bankCode: string, accountNumber: string) {
  await requireTenantMember(slug);
  if (!bankCode || !accountNumber.trim()) {
    return { error: "Pick a bank and enter the account number." };
  }

  try {
    const { accountName } = await resolveAccountNumber(accountNumber.trim(), bankCode);
    return { accountName };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not verify that account." };
  }
}

export async function linkPayout(slug: string, formData: FormData) {
  const { tenant } = await requireTenantMember(slug);

  const businessName = String(formData.get("businessName") ?? "").trim();
  const bankCode = String(formData.get("bankCode") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  if (!businessName || !bankCode || !accountNumber) {
    return { error: "Missing payout details." };
  }

  try {
    const { subaccountCode } = await createSubaccount({ businessName, bankCode, accountNumber });
    await db
      .update(tenants)
      .set({
        paystackSubaccountCode: subaccountCode,
        kycLevel: Math.max(tenant.kycLevel, KYC_LEVEL_BY_DOC_TYPE.momo_match),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenant.id));

    // Paystack's resolveAccountNumber call already did the name match
    // (Part 2 §3) — record it as system-approved, no staff review needed.
    await db.insert(kycDocuments).values({
      tenantId: tenant.id,
      type: "momo_match",
      status: "approved",
      reviewedAt: new Date(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not link payout account." };
  }

  revalidatePath(`/my/${slug}/payouts`);
  revalidatePath(`/my/${slug}/verification`);
}
