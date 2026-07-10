"use server";

import { revalidatePath } from "next/cache";
import { db, kycDocuments } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { saveUploadedImage } from "@/lib/storage";

type UploadableDocType = "ghana_card" | "business_registration";

export async function submitKycDocument(
  slug: string,
  type: UploadableDocType,
  formData: FormData,
) {
  const { tenant } = await requireTenantMember(slug);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  let fileUrl: string;
  try {
    fileUrl = await saveUploadedImage(tenant.id, file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not upload photo." };
  }

  // A fresh row per submission (not an update) — keeps the rejection
  // history intact for whoever reviews the next attempt.
  await db.insert(kycDocuments).values({
    tenantId: tenant.id,
    type,
    status: "pending",
    fileUrl,
  });

  revalidatePath(`/my/${slug}/verification`);
}
