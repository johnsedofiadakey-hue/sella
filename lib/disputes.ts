// No "server-only" guard here on purpose — this is pure date/lookup logic
// (no DB, no secrets) and is imported from client components like
// order-row.tsx to render dispute status without a round-trip.
import type { Dispute } from "@/db/schema";

const RESOLVED_STATUSES = new Set(["resolved_refund", "resolved_replacement", "resolved_rejected"]);

// A dispute is "escalated" either because the merchant contested it
// (status flipped directly) or because the 48h respond-by window lapsed
// with no response — the second case is computed on read, same lazy
// pattern as lib/billing.ts's trial/grace/paused phases. No cron needed.
export function isEscalated(dispute: Dispute, now: Date = new Date()): boolean {
  if (RESOLVED_STATUSES.has(dispute.status)) return false;
  if (dispute.status === "escalated") return true;
  return dispute.respondByAt < now;
}

export function isResolved(dispute: Dispute): boolean {
  return RESOLVED_STATUSES.has(dispute.status);
}

export const DISPUTE_REASON_LABELS: Record<string, string> = {
  not_received: "Item not received",
  not_as_described: "Not as described",
  wrong_item: "Wrong item",
  refund_refused: "Refund refused",
  other: "Other",
};
