import Link from "next/link";
import { ilike, or, desc } from "drizzle-orm";
import { db, tenants } from "@/db";
import { CATEGORY_LABELS } from "@/lib/tenants";

export default async function TenantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const list = await db.query.tenants.findMany({
    where: q ? or(ilike(tenants.businessName, `%${q}%`), ilike(tenants.slug, `%${q}%`)) : undefined,
    orderBy: [desc(tenants.createdAt)],
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Tenants</h1>
      <form className="mt-4" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or slug"
          className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-forest"
        />
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2 font-semibold">Business</th>
              <th className="px-4 py-2 font-semibold">Category</th>
              <th className="px-4 py-2 font-semibold">Tier</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {list.map((tenant) => (
              <tr key={tenant.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/mission-control/tenants/${tenant.slug}`}
                    className="font-semibold text-forest hover:underline"
                  >
                    {tenant.businessName}
                  </Link>
                  <p className="text-xs text-ink-muted">{tenant.slug}</p>
                </td>
                <td className="px-4 py-2 text-ink-muted">
                  {CATEGORY_LABELS[tenant.category] ?? tenant.category}
                </td>
                <td className="px-4 py-2 capitalize text-ink-muted">{tenant.tier}</td>
                <td className="px-4 py-2 capitalize text-ink-muted">{tenant.status}</td>
                <td className="px-4 py-2 tabular-nums text-ink-muted">
                  {tenant.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-4 text-sm text-ink-muted">No tenants match.</p>}
      </div>
    </div>
  );
}
