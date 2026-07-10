import Link from "next/link";
import { requireTenantMember } from "@/lib/authz";
import { getRidersForTenant } from "@/lib/riders";
import RiderForm from "./rider-form";
import { deleteRider } from "./actions";

// Part 2 §4 / Part 4 §2's rider book: save a rider's name and MoMo/phone
// once here, then one-tap assign from the saved list on any order.
export default async function RidersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);
  const list = await getRidersForTenant(tenant.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Riders</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Save the riders you use so you can dispatch with one tap from any order.
      </p>

      <RiderForm slug={slug} />

      {list.length === 0 ? (
        <p className="mt-6 text-ink-muted">No riders saved yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {list.map((rider) => (
            <li
              key={rider.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <div>
                <p className="font-semibold text-ink">{rider.name}</p>
                <p className="text-sm text-ink-muted">{rider.phone}</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await deleteRider(slug, rider.id);
                }}
              >
                <button type="submit" className="text-xs text-danger underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
