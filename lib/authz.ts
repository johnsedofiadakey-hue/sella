import "server-only";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, tenantMembers, tenants } from "@/db";
import { getSession } from "./auth";

// Guards every /my/[slug]/* route and action — a merchant must be a member
// of the tenant they're managing. Unauthorized access 404s rather than
// 403s: the slug is public (it's the storefront URL), but whether *this*
// user manages it is not information worth confirming either way.
export async function requireTenantMember(tenantSlug: string) {
  const session = await getSession();
  if (!session) redirect("/my/login");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, tenantSlug) });
  if (!tenant) notFound();

  const membership = await db.query.tenantMembers.findFirst({
    where: and(eq(tenantMembers.tenantId, tenant.id), eq(tenantMembers.userId, session.user.id)),
  });
  if (!membership) notFound();

  return { session, tenant, membership };
}
