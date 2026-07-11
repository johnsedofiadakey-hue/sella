import "server-only";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, rateLimitHits } from "@/db";

// Generic "N hits per window per key" limiter — see db/schema.ts's comment
// on rateLimitHits for why this is Postgres rather than Redis. Returns
// false (and records nothing extra) once the caller is over the limit, so
// a caller retrying rapidly doesn't push their own reset further out.
export async function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);

  const recent = await db.query.rateLimitHits.findMany({
    where: and(eq(rateLimitHits.key, key), gte(rateLimitHits.createdAt, since)),
    columns: { id: true },
  });
  if (recent.length >= maxHits) return false;

  await db.insert(rateLimitHits).values({ key });

  // Opportunistic cleanup — every window's hits are short-lived, so any
  // row older than an hour is dead weight from a prior window. No cron
  // exists in this stack, so this is the cleanup mechanism; sampled at
  // ~10% of calls so every check isn't paying for a table-wide delete.
  if (Math.random() < 0.1) {
    await db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, new Date(Date.now() - 60 * 60 * 1000)));
  }

  return true;
}
