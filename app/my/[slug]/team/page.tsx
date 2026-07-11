import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireTenantMember } from "@/lib/authz";
import { getSubscriptionForTenant } from "@/lib/tenants";
import { STAFF_LIMITS } from "@/lib/pricing";
import { db, tenantMembers, users } from "@/db";
import InviteForm from "./invite-form";
import { removeTeamMember } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
};

// Part 3 §1's tier ladder ("3 staff accounts", "10 staff accounts with
// roles") had a schema (tenantMembers + memberRoleEnum) but no UI — this
// closes that gap. Every mutation is re-authorized in team/actions.ts, not
// just gated by isOwner here.
export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant, membership } = await requireTenantMember(slug);
  const isOwner = membership.role === "owner";

  const members = await db
    .select({ member: tenantMembers, user: users })
    .from(tenantMembers)
    .innerJoin(users, eq(users.id, tenantMembers.userId))
    .where(eq(tenantMembers.tenantId, tenant.id));

  const subscription = await getSubscriptionForTenant(tenant.id);
  const tier = subscription?.tier ?? "starter";
  const limit = STAFF_LIMITS[tier] ?? 1;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Team</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {members.length} of {limit} staff account{limit === 1 ? "" : "s"} used on your plan.
      </p>

      {isOwner && <InviteForm slug={slug} />}

      <ul className="mt-6 flex flex-col gap-2">
        {members.map(({ member, user }) => (
          <li
            key={member.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <div>
              <p className="font-semibold text-ink">{user.phone}</p>
              <p className="text-xs text-ink-muted">{ROLE_LABELS[member.role] ?? member.role}</p>
            </div>
            {isOwner && member.id !== membership.id && (
              <form
                action={async () => {
                  "use server";
                  await removeTeamMember(slug, member.id);
                }}
              >
                <button type="submit" className="text-xs text-danger underline">
                  Remove
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
