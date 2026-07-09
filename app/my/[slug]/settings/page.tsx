import Link from "next/link";
import { requireTenantMember } from "@/lib/authz";
import BrandingForm from "./branding-form";

export default async function StoreSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Branding</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Your logo and two colours — everything else about your store stays fast and consistent
        by design.
      </p>

      <BrandingForm
        slug={slug}
        currentPrimary={tenant.themePrimaryColor ?? "#0b6e4f"}
        currentAccent={tenant.themeAccentColor ?? "#f2a007"}
        currentLogoUrl={tenant.logoUrl}
      />
    </div>
  );
}
