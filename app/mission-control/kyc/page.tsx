import { desc, eq } from "drizzle-orm";
import { db, kycDocuments, tenants } from "@/db";
import KycRow from "./kyc-row";

export default async function KycQueuePage() {
  const pending = await db
    .select({ doc: kycDocuments, tenant: tenants })
    .from(kycDocuments)
    .innerJoin(tenants, eq(tenants.id, kycDocuments.tenantId))
    .where(eq(kycDocuments.status, "pending"))
    .orderBy(desc(kycDocuments.createdAt));

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">KYC review queue</h1>
      {pending.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Nothing pending review.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {pending.map(({ doc, tenant }) => (
            <KycRow key={doc.id} doc={doc} tenant={tenant} />
          ))}
        </ul>
      )}
    </div>
  );
}
