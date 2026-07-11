"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, products, enquiries, bookings } from "@/db";
import { getTenantBySlug } from "@/lib/tenants";
import { normalizePhone } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";

const enquirySchema = z.object({
  buyerName: z.string().trim().min(2, "Enter your name."),
  buyerPhone: z.string().trim().min(6, "Enter a valid phone number."),
  message: z.string().trim().max(500).optional(),
});

// Automobile per Part 1 §4: "enquiry & lead-gen, not cart." A lead never
// touches payments or the order pipeline — this is the entire flow.
export async function createEnquiry(slug: string, productId: string, formData: FormData) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { error: "Store not found." };

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.tenantId, tenant.id)),
  });
  if (!product) return { error: "Listing not found." };

  const parsed = enquirySchema.safeParse({
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone"),
    message: formData.get("message") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rateLimitKey = `enquiry:${tenant.id}:${normalizePhone(parsed.data.buyerPhone)}`;
  if (!(await checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000))) {
    return { error: "Too many enquiries sent — wait a few minutes and try again." };
  }

  const [enquiry] = await db
    .insert(enquiries)
    .values({
      tenantId: tenant.id,
      productId: product.id,
      buyerName: parsed.data.buyerName,
      buyerPhone: parsed.data.buyerPhone,
      message: parsed.data.message || null,
    })
    .returning();

  redirect(`/store/${slug}/enquire/${enquiry.id}`);
}

const bookingSchema = z.object({
  buyerName: z.string().trim().min(2, "Enter your name."),
  buyerPhone: z.string().trim().min(6, "Enter a valid phone number."),
  scheduledFor: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a date and time."),
});

// Beauty, Salon & Services per Part 1 §4: "booking, not shipping." A single
// requested time per booking — no staff selection or slot-capacity model
// yet (Part 1 lists both as template features this cut doesn't build).
export async function createBooking(slug: string, productId: string, formData: FormData) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { error: "Store not found." };

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.tenantId, tenant.id)),
  });
  if (!product) return { error: "Service not found." };

  const parsed = bookingSchema.safeParse({
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone"),
    scheduledFor: formData.get("scheduledFor"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const scheduledFor = new Date(parsed.data.scheduledFor);
  if (scheduledFor.getTime() < Date.now()) {
    return { error: "Pick a time in the future." };
  }

  const rateLimitKey = `booking:${tenant.id}:${normalizePhone(parsed.data.buyerPhone)}`;
  if (!(await checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000))) {
    return { error: "Too many booking requests — wait a few minutes and try again." };
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      tenantId: tenant.id,
      productId: product.id,
      buyerName: parsed.data.buyerName,
      buyerPhone: parsed.data.buyerPhone,
      scheduledFor,
    })
    .returning();

  redirect(`/store/${slug}/book/${booking.id}`);
}
