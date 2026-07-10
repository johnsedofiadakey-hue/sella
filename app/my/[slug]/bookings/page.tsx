import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { requireTenantMember } from "@/lib/authz";
import { db, bookings, products } from "@/db";
import { confirmBooking, completeBooking, cancelBooking } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Beauty, Salon & Services' booking queue (Part 1 §4) — kept separate from
// orders since a booking never has a cart, payment, or delivery to track.
export default async function BookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);

  const list = await db.query.bookings.findMany({
    where: eq(bookings.tenantId, tenant.id),
    orderBy: [asc(bookings.scheduledFor)],
  });
  const productIds = [...new Set(list.map((b) => b.productId).filter((id): id is string => Boolean(id)))];
  const relatedProducts =
    productIds.length > 0
      ? await db.query.products.findMany({ where: inArray(products.id, productIds) })
      : [];
  const productById = new Map(relatedProducts.map((p) => [p.id, p]));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Bookings</h1>

      {list.length === 0 ? (
        <p className="mt-4 text-ink-muted">No bookings yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {list.map((booking) => {
            const product = booking.productId ? productById.get(booking.productId) : null;
            return (
              <li key={booking.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{product?.name ?? "Service removed"}</p>
                    <p className="text-sm text-ink-muted">
                      {booking.buyerName} · {booking.buyerPhone}
                    </p>
                    <p className="text-sm text-forest">
                      {booking.scheduledFor.toLocaleString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark">
                    {STATUS_LABELS[booking.status] ?? booking.status}
                  </span>
                </div>
                {(booking.status === "requested" || booking.status === "confirmed") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {booking.status === "requested" && (
                      <form
                        action={async () => {
                          "use server";
                          await confirmBooking(slug, booking.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Confirm
                        </button>
                      </form>
                    )}
                    {booking.status === "confirmed" && (
                      <form
                        action={async () => {
                          "use server";
                          await completeBooking(slug, booking.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-gold-ink"
                        >
                          Mark completed
                        </button>
                      </form>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        await cancelBooking(slug, booking.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-danger"
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
