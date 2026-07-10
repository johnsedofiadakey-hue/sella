import "server-only";
import { eq } from "drizzle-orm";
import { db, riders } from "@/db";

export async function getRidersForTenant(tenantId: string) {
  return db.query.riders.findMany({
    where: eq(riders.tenantId, tenantId),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

// Called from both the rider-book settings page and assignRider (Part 2 §4:
// "the merchant saves their riders' names and MoMo/phone numbers ... once").
// Assigning a rider always upserts here, so a name typed once during
// dispatch is already saved for the next order without a separate step.
export async function saveRider(tenantId: string, name: string, phone: string) {
  const [rider] = await db
    .insert(riders)
    .values({ tenantId, name, phone })
    .onConflictDoUpdate({
      target: [riders.tenantId, riders.phone],
      set: { name },
    })
    .returning();
  return rider;
}
