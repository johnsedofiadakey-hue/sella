import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db, storeVisits, orders } from "@/db";

// Part 3 §1's trial-conversion pitch is a specific number: "your store had
// 214 visits and 9 orders this month." Recording a row per storefront view
// is the entire mechanism — no external analytics service to bill or wire.
export async function recordStoreVisit(tenantId: string): Promise<void> {
  await db.insert(storeVisits).values({ tenantId });
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getMonthlyStoreStats(tenantId: string, now: Date = new Date()) {
  const since = startOfMonth(now);

  const [visits, monthOrders] = await Promise.all([
    db.query.storeVisits.findMany({
      where: and(eq(storeVisits.tenantId, tenantId), gte(storeVisits.createdAt, since)),
      columns: { id: true },
    }),
    db.query.orders.findMany({
      where: and(eq(orders.tenantId, tenantId), gte(orders.createdAt, since)),
      columns: { id: true },
    }),
  ]);

  return { visits: visits.length, orders: monthOrders.length };
}
