import { requireTenantMember } from "@/lib/authz";
import ProductForm from "./product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-dark">Add a product</h1>
      <p className="mt-1 text-sm text-ink-muted">Photo, name, price — the rest can wait.</p>
      <ProductForm slug={slug} category={tenant.category} />
    </div>
  );
}
