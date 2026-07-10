import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, products } from "@/db";
import { getTenantBySlug } from "@/lib/tenants";
import {
  getSizes,
  getUnit,
  getCondition,
  CONDITION_LABELS,
  getWarranty,
  getSpecs,
  isPriceOnRequest,
  getServiceDurationMins,
  getFileUrl,
} from "@/lib/product-attributes";
import AddToCartButton from "@/components/storefront/AddToCartButton";
import EnquiryForm from "./enquiry-form";
import BookingForm from "./booking-form";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.tenantId, tenant.id), eq(products.isActive, true)),
  });
  if (!product) notFound();

  const sizes = getSizes(product);
  const unit = getUnit(product);
  const condition = getCondition(product);
  const warranty = getWarranty(product);
  const specs = getSpecs(product);
  const onRequest = tenant.category === "automobile" && isPriceOnRequest(product);
  const durationMins = getServiceDurationMins(product);
  const isDigital = tenant.category === "digital_products";
  const hasFile = Boolean(getFileUrl(product));

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      {product.images[0] && (
        <div className="aspect-square overflow-hidden rounded-lg bg-forest-tint">
          {/* eslint-disable-next-line @next/next/no-img-element -- local upload stand-in */}
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
        </div>
      )}

      <h1 className="mt-4 text-2xl font-bold text-forest-dark">{product.name}</h1>
      <p className="mt-1 text-xl font-bold text-forest">
        {onRequest ? "Price on request" : `GHS ${(product.priceCents / 100).toFixed(2)}`}
        {unit && !onRequest && <span className="font-normal text-ink-muted"> / {unit}</span>}
      </p>

      {(condition || warranty || durationMins) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {condition && (
            <span className="rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark">
              {CONDITION_LABELS[condition] ?? condition}
            </span>
          )}
          {warranty && (
            <span className="rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark">
              Warranty: {warranty}
            </span>
          )}
          {durationMins && (
            <span className="rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark">
              {durationMins} min
            </span>
          )}
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sizes.map((size) => (
            <span
              key={size}
              className="rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark"
            >
              {size}
            </span>
          ))}
        </div>
      )}

      {product.description && <p className="mt-3 text-sm text-ink-muted">{product.description}</p>}

      {specs.length > 0 && (
        <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
          {specs.map((spec) => (
            <div key={spec.label} className="flex justify-between px-3 py-2 text-sm">
              <span className="text-ink-muted">{spec.label}</span>
              <span className="font-medium text-ink">{spec.value}</span>
            </div>
          ))}
        </div>
      )}

      {isDigital && hasFile && (
        <p className="mt-3 text-xs text-ink-muted">
          Instant delivery — you&apos;ll get a download link right after payment.
        </p>
      )}

      {tenant.category === "automobile" ? (
        <EnquiryForm slug={slug} productId={product.id} />
      ) : tenant.category === "beauty_services" ? (
        <BookingForm slug={slug} productId={product.id} />
      ) : (
        <div className="mt-6">
          <AddToCartButton slug={slug} productId={product.id} />
        </div>
      )}
    </div>
  );
}
