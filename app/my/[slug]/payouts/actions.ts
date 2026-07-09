"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, tenants } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { createSubaccount, resolveAccountNumber } from "@/lib/paystack";

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
      .set({ paystackSubaccountCode: subaccountCode, updatedAt: new Date() })
      .where(eq(tenants.id, tenant.id));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not link payout account." };
  }

  revalidatePath(`/my/${slug}/payouts`);
}
