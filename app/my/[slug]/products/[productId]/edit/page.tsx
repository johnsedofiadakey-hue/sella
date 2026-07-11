import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, products } from "@/db";
import { requireTenantMember } from "@/lib/authz";
import ProductForm from "../../../new-product/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  const { tenant } = await requireTenantMember(slug);

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.tenantId, tenant.id)),
  });
  if (!product) notFound();

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-dark">Edit product</h1>
      <p className="mt-1 text-sm text-ink-muted">Update the listing — buyers see the change immediately.</p>
      <ProductForm slug={slug} category={tenant.category} product={product} />
    </div>
  );
}
