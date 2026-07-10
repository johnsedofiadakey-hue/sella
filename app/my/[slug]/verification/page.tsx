import Link from "next/link";
import { requireTenantMember } from "@/lib/authz";
import { getLatestKycDocuments } from "@/lib/kyc";
import type { KycDocument } from "@/db/schema";
import UploadForm from "./upload-form";

const KYC_LEVEL_LABELS = ["Phone only", "Identity verified", "Business verified"];

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await requireTenantMember(slug);
  const latestByType = await getLatestKycDocuments(tenant.id);

  const ghanaCard = latestByType.get("ghana_card");
  const momoMatch = latestByType.get("momo_match");
  const businessReg = latestByType.get("business_registration");

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <Link href={`/my/${slug}`} className="text-xs text-ink-muted underline">
        ← {tenant.businessName}
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">Verification</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Level {tenant.kycLevel} — {KYC_LEVEL_LABELS[tenant.kycLevel] ?? "Phone only"}.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-ink">Ghana Card</p>
          <p className="text-xs text-ink-muted">Required before your first payout.</p>
          <DocStatus slug={slug} type="ghana_card" doc={ghanaCard} />
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">MoMo name match</p>
          <p className="text-xs text-ink-muted">
            Confirmed automatically when you link a payout account.
          </p>
          {momoMatch ? (
            <StatusLine status={momoMatch.status} matchedLabel="Matched." />
          ) : (
            <Link
              href={`/my/${slug}/payouts`}
              className="mt-2 inline-block text-xs font-semibold text-forest underline"
            >
              Link a payout account →
            </Link>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">Business registration (ORC)</p>
          <p className="text-xs text-ink-muted">
            Only needed for high sales volume or restricted categories.
          </p>
          <DocStatus slug={slug} type="business_registration" doc={businessReg} />
        </div>
      </div>
    </div>
  );
}

function DocStatus({
  slug,
  type,
  doc,
}: {
  slug: string;
  type: "ghana_card" | "business_registration";
  doc: KycDocument | undefined;
}) {
  if (!doc) return <UploadForm slug={slug} type={type} />;
  if (doc.status === "pending") {
    return <p className="mt-2 text-xs text-gold-ink">Submitted — awaiting review.</p>;
  }
  if (doc.status === "approved") {
    return <p className="mt-2 text-xs text-forest">Approved.</p>;
  }
  return (
    <div className="mt-2">
      <p className="text-xs text-danger">
        Rejected: {doc.rejectionReason ?? "No reason given."}
      </p>
      <UploadForm slug={slug} type={type} />
    </div>
  );
}

function StatusLine({ status, matchedLabel }: { status: string; matchedLabel: string }) {
  if (status === "approved") return <p className="mt-2 text-xs text-forest">{matchedLabel}</p>;
  if (status === "rejected") {
    return <p className="mt-2 text-xs text-danger">Name mismatch — relink your account.</p>;
  }
  return <p className="mt-2 text-xs text-gold-ink">Checking…</p>;
}
