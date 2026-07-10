"use client";

import { useState, useTransition } from "react";
import type { KycDocument, Tenant } from "@/db/schema";
import { approveKycDocument, rejectKycDocument } from "./actions";

const DOC_LABELS: Record<string, string> = {
  ghana_card: "Ghana Card",
  business_registration: "Business registration",
  momo_match: "MoMo name match",
};

export default function KycRow({ doc, tenant }: { doc: KycDocument; tenant: Tenant }) {
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approveKycDocument(doc.id);
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectKycDocument(doc.id, reason);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{tenant.businessName}</p>
          <p className="text-xs text-ink-muted">
            {DOC_LABELS[doc.type] ?? doc.type} · {tenant.slug}
          </p>
        </div>
        {doc.fileUrl && (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-semibold text-forest underline"
          >
            View file →
          </a>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Approve
        </button>
        {mode !== "reject" && (
          <button
            type="button"
            onClick={() => setMode("reject")}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Reject
          </button>
        )}
      </div>

      {mode === "reject" && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to merchant)"
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-forest"
          />
          <button
            type="button"
            onClick={handleReject}
            disabled={isPending || !reason.trim()}
            className="self-start rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Rejecting…" : "Confirm reject"}
          </button>
        </div>
      )}
    </li>
  );
}
