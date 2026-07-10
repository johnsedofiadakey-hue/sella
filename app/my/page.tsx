import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tenantMembers, tenants } from "@/db";
import { getSession } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/tenants";
import { logout } from "./actions";

export default async function PortalHome() {
  const session = await getSession();
  if (!session) redirect("/my/login");

  const memberships = await db
    .select({ tenant: tenants })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .where(eq(tenantMembers.userId, session.user.id));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Sella portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-forest-dark">{session.user.phone}</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-ink-muted underline">
            Log out
          </button>
        </form>
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Your stores
      </h2>

      {memberships.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-ink-muted">You don&apos;t have a store yet.</p>
          <Link
            href="/my/new"
            className="mt-3 inline-block rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-ink"
          >
            Create your store
          </Link>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {memberships.map(({ tenant }) => (
            <li
              key={tenant.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <p className="font-semibold text-ink">{tenant.businessName}</p>
                <p className="text-sm text-ink-muted">
                  {CATEGORY_LABELS[tenant.category] ?? tenant.category} · {tenant.slug}
                  .sella.app
                </p>
              </div>
              <a
                href={`/?store=${tenant.slug}`}
                className="text-sm font-semibold text-forest"
              >
                View store →
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
