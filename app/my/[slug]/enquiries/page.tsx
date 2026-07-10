import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { requireTenantMember } from "@/lib/authz";
import { db, enquiries, products } from "@/db";
import { markEnquiryContacted, closeEnquiry } from "./actions";

const STATUS_LABELS: Record<string, string> = { new: "New", contacted: "Contacted", closed: "Closed" };

// Automobile's lead-gen queue (Part 1 §4) — enquiries never touch orders,
// so this is a separate list rather than a filter on the orders page.
export default async function EnquiriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);

  const list = await db.query.enquiries.findMany({
    where: eq(enquiries.tenantId, tenant.id),
    orderBy: [desc(enquiries.createdAt)],
  });
  const productIds = [...new Set(list.map((e) => e.productId).filter((id): id is string => Boolean(id)))];
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
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Enquiries</h1>

      {list.length === 0 ? (
        <p className="mt-4 text-ink-muted">No enquiries yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {list.map((enquiry) => {
            const product = enquiry.productId ? productById.get(enquiry.productId) : null;
            return (
              <li key={enquiry.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{product?.name ?? "Listing removed"}</p>
                    <p className="text-sm text-ink-muted">
                      {enquiry.buyerName} · {enquiry.buyerPhone}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark">
                    {STATUS_LABELS[enquiry.status] ?? enquiry.status}
                  </span>
                </div>
                {enquiry.message && <p className="mt-2 text-sm text-ink-muted">{enquiry.message}</p>}
                {enquiry.status !== "closed" && (
                  <div className="mt-3 flex gap-2">
                    {enquiry.status === "new" && (
                      <form
                        action={async () => {
                          "use server";
                          await markEnquiryContacted(slug, enquiry.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Mark contacted
                        </button>
                      </form>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        await closeEnquiry(slug, enquiry.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        Close
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
