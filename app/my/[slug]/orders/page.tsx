import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireTenantMember } from "@/lib/authz";
import { db, orders } from "@/db";
import OrderRow from "./order-row";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);

  const list = await db.query.orders.findMany({
    where: eq(orders.tenantId, tenant.id),
    orderBy: [desc(orders.createdAt)],
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Orders</h1>

      {list.length === 0 ? (
        <p className="mt-4 text-ink-muted">No orders yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {list.map((order) => (
            <OrderRow key={order.id} slug={slug} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
