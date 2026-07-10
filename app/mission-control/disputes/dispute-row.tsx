"use client";

import { useState, useTransition } from "react";
import type { Dispute, Order, Tenant } from "@/db/schema";
import { DISPUTE_REASON_LABELS } from "@/lib/disputes";
import { ruleOnDispute } from "./actions";

export default function DisputeRow({
  dispute,
  tenant,
  order,
}: {
  dispute: Dispute;
  tenant: Tenant;
  order: Order;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRule(ruling: "refund" | "replacement" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await ruleOnDispute(dispute.id, ruling, note);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{tenant.businessName}</p>
          <p className="text-xs text-ink-muted">
            Order #{order.id.slice(0, 8)} · {order.buyerName} · GHS{" "}
            {(order.totalCents / 100).toFixed(2)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark">
          {dispute.status === "escalated" ? "Contested" : "Overdue"}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-ink">
        {DISPUTE_REASON_LABELS[dispute.reason] ?? dispute.reason}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{dispute.description}</p>

      {dispute.merchantResponse && (
        <div className="mt-2 rounded-md border border-border bg-paper p-2">
          <p className="text-xs font-semibold text-ink">Seller response</p>
          <p className="mt-0.5 text-xs text-ink-muted">{dispute.merchantResponse}</p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Resolution note (kept on record)"
          className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-forest"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleRule("refund")}
            disabled={isPending || !note.trim()}
            className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Rule: Refund
          </button>
          <button
            type="button"
            onClick={() => handleRule("replacement")}
            disabled={isPending || !note.trim()}
            className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Rule: Replacement
          </button>
          <button
            type="button"
            onClick={() => handleRule("rejected")}
            disabled={isPending || !note.trim()}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
          >
            Rule: Reject
          </button>
        </div>
      </div>
    </li>
  );
}
