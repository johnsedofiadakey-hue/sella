import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, enquiries, products } from "@/db";

export default async function EnquiryConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; enquiryId: string }>;
}) {
  const { enquiryId } = await params;
  const enquiry = await db.query.enquiries.findFirst({ where: eq(enquiries.id, enquiryId) });
  if (!enquiry) notFound();

  const product = enquiry.productId
    ? await db.query.products.findFirst({ where: eq(products.id, enquiry.productId) })
    : null;

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-forest-dark">Enquiry sent</h1>
      {product && <p className="mt-1 text-sm text-ink-muted">{product.name}</p>}
      <p className="mt-4 text-sm text-ink-muted">
        The seller has your name and phone number and will reach out directly. There&apos;s
        nothing else to do here.
      </p>
    </div>
  );
}
