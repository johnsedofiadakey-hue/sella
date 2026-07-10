"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, bookings } from "@/db";
import { requireTenantMember } from "@/lib/authz";

export async function confirmBooking(slug: string, bookingId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db
    .update(bookings)
    .set({ status: "confirmed" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/bookings`);
}

export async function completeBooking(slug: string, bookingId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db
    .update(bookings)
    .set({ status: "completed" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/bookings`);
}

export async function cancelBooking(slug: string, bookingId: string) {
  const { tenant } = await requireTenantMember(slug);
  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/bookings`);
}
