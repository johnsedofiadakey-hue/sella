"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tenantMembers, tenants, users } from "@/db";
import { requestOtp, verifyOtp } from "@/lib/otp";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { uniqueTenantSlug } from "@/lib/slug";

const phoneSchema = z.string().min(6, "Enter a valid phone number.");
const codeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code.");

export async function requestLoginCode(formData: FormData) {
  const parsed = phoneSchema.safeParse(normalizePhone(String(formData.get("phone") ?? "")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.phone, phone) });

  try {
    await requestOtp(phone, existing ? "login" : "signup");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send code." };
  }
  return { ok: true as const, phone };
}

export async function verifyLoginCode(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const parsedCode = codeSchema.safeParse(String(formData.get("code") ?? "").trim());
  if (!phone) return { error: "Enter your phone number again." };
  if (!parsedCode.success) return { error: parsedCode.error.issues[0].message };
  const code = parsedCode.data;

  const existing = await db.query.users.findFirst({ where: eq(users.phone, phone) });
  const purpose = existing ? "login" : "signup";

  const valid = await verifyOtp(phone, code, purpose);
  if (!valid) return { error: "That code is wrong or has expired." };

  const user = existing ?? (await db.insert(users).values({ phone }).returning())[0];
  await createSession(user.id);
  redirect("/my");
}

export async function logout() {
  await destroySession();
  redirect("/my/login");
}

const createStoreSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name.").max(100),
  category: z.enum([
    "general_retail",
    "fashion",
    "food",
    "automobile",
    "groceries",
    "electronics",
    "beauty_services",
    "digital_products",
    "laundry",
  ]),
});

export async function createStore(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/my/login");

  const parsed = createStoreSchema.safeParse({
    businessName: formData.get("businessName"),
    category: formData.get("category"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { businessName, category } = parsed.data;
  const slug = await uniqueTenantSlug(businessName);

  const [tenant] = await db
    .insert(tenants)
    .values({
      slug,
      businessName,
      category,
      ownerPhone: session.user.phone,
      status: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(tenantMembers).values({
    tenantId: tenant.id,
    userId: session.user.id,
    role: "owner",
  });

  redirect("/my");
}
