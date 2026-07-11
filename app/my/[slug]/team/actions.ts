"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, users, tenantMembers } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import { normalizePhone } from "@/lib/phone";
import { STAFF_LIMITS } from "@/lib/pricing";
import { getSubscriptionForTenant } from "@/lib/tenants";

// Every exported action here re-checks membership.role itself — a Server
// Action is a public endpoint regardless of whether the page that renders
// its form also happens to hide the button, so the page-level `isOwner`
// check in team/page.tsx is UX only, not the actual authorization.

export async function inviteTeamMember(slug: string, formData: FormData) {
  const { tenant, membership } = await requireTenantMember(slug);
  if (membership.role !== "owner") {
    return { error: "Only the store owner can add team members." };
  }

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const role = String(formData.get("role") ?? "");
  if (phone.length < 6) return { error: "Enter a valid phone number." };
  if (role !== "manager" && role !== "cashier") return { error: "Choose a role." };

  const subscription = await getSubscriptionForTenant(tenant.id);
  const tier = subscription?.tier ?? "starter";
  const limit = STAFF_LIMITS[tier] ?? 1;

  const currentMembers = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.tenantId, tenant.id),
  });
  if (currentMembers.length >= limit) {
    return {
      error: `Your plan allows up to ${limit} staff account${limit === 1 ? "" : "s"}. Upgrade for more.`,
    };
  }

  const [inserted] = await db
    .insert(users)
    .values({ phone })
    .onConflictDoNothing({ target: users.phone })
    .returning();
  const user = inserted ?? (await db.query.users.findFirst({ where: eq(users.phone, phone) }));
  if (!user) return { error: "Something went wrong — try again." };

  if (currentMembers.some((m) => m.userId === user.id)) {
    return { error: "That phone number is already on your team." };
  }

  await db.insert(tenantMembers).values({ tenantId: tenant.id, userId: user.id, role });
  revalidatePath(`/my/${slug}/team`);
}

export async function removeTeamMember(slug: string, memberId: string) {
  const { tenant, membership } = await requireTenantMember(slug);
  if (membership.role !== "owner") {
    return { error: "Only the store owner can remove team members." };
  }
  if (memberId === membership.id) return { error: "You can't remove yourself." };

  await db
    .delete(tenantMembers)
    .where(and(eq(tenantMembers.id, memberId), eq(tenantMembers.tenantId, tenant.id)));
  revalidatePath(`/my/${slug}/team`);
}
