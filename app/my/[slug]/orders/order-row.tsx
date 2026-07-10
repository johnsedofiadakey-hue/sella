"use client";

import { useState, useTransition } from "react";
import type { Dispute, Order } from "@/db/schema";
import { isEscalated, isResolved, DISPUTE_REASON_LABELS } from "@/lib/disputes";
import {
  assignRider,
  confirmOrder,
  contestDispute,
  markDelivered,
  markPickedUp,
  resolveDisputeAsMerchant,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export default function OrderRow({
  slug,
  order,
  dispute,
}: {
  slug: string;
  order: Order;
  dispute: Dispute | undefined;
}) {
  const [mode, setMode] = useState<"idle" | "assign-rider" | "enter-otp" | "contest">("idle");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await confirmOrder(slug, order.id);
    });
  }

  function handleAssignRider() {
    setError(null);
    startTransition(async () => {
      const result = await assignRider(slug, order.id, riderName, riderPhone);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMode("idle");
    });
  }

  function handleMarkPickedUp() {
    startTransition(async () => {
      await markPickedUp(slug, order.id);
    });
  }

  function handleMarkDelivered() {
    setError(null);
    startTransition(async () => {
      const result = await markDelivered(slug, order.id, otp);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMode("idle");
    });
  }

  function handleResolve(resolutionType: "refund" | "replacement") {
    if (!dispute) return;
    setError(null);
    startTransition(async () => {
      await resolveDisputeAsMerchant(slug, dispute.id, resolutionType);
    });
  }

  function handleContest() {
    if (!dispute) return;
    setError(null);
    startTransition(async () => {
      const result = await contestDispute(slug, dispute.id, response);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMode("idle");
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">Order #{order.id.slice(0, 8)}</p>
          <p className="text-sm text-ink-muted">
            {order.buyerName} · {order.buyerPhone}
          </p>
          <p className="text-sm text-forest">GHS {(order.totalCents / 100).toFixed(2)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-forest-tint px-2.5 py-1 text-xs font-semibold text-forest-dark">
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {order.fulfillmentType === "delivery" && (order.deliveryArea || order.deliveryLandmark) && (
        <p className="mt-2 text-xs text-ink-muted">
          {[order.deliveryArea, order.deliveryLandmark].filter(Boolean).join(" · ")}
        </p>
      )}

      {order.riderName && (
        <p className="mt-1 text-xs text-ink-muted">
          Rider: {order.riderName} · {order.riderPhone}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {dispute && (
        <div className="mt-3 rounded-md border border-danger bg-forest-tint p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger">
            {isResolved(dispute)
              ? "Resolved"
              : isEscalated(dispute)
                ? "Escalated to ShopLocal"
                : "Buyer reported a problem"}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {DISPUTE_REASON_LABELS[dispute.reason] ?? dispute.reason}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{dispute.description}</p>
          {!isResolved(dispute) && !isEscalated(dispute) && (
            <p className="mt-1 text-xs text-ink-muted">
              Respond by{" "}
              {dispute.respondByAt.toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
          {dispute.merchantResponse && (
            <p className="mt-2 text-xs text-ink-muted">Your response: {dispute.merchantResponse}</p>
          )}
          {dispute.resolution && (
            <p className="mt-2 text-xs font-semibold text-ink">Outcome: {dispute.resolution}</p>
          )}

          {!isResolved(dispute) && dispute.status !== "escalated" && mode !== "contest" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleResolve("refund")}
                disabled={isPending}
                className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                Refund
              </button>
              <button
                type="button"
                onClick={() => handleResolve("replacement")}
                disabled={isPending}
                className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setMode("contest")}
                disabled={isPending}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
              >
                Contest
              </button>
            </div>
          )}

          {mode === "contest" && (
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder="Evidence or explanation for ShopLocal to review"
                className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-forest"
              />
              <button
                type="button"
                onClick={handleContest}
                disabled={isPending}
                className="self-start rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {isPending ? "Submitting…" : "Submit to ShopLocal"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "pending" && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Confirm
          </button>
        )}

        {order.status === "confirmed" && order.fulfillmentType === "delivery" && mode !== "assign-rider" && (
          <button
            type="button"
            onClick={() => setMode("assign-rider")}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Assign rider
          </button>
        )}

        {order.status === "confirmed" && order.fulfillmentType === "pickup" && (
          <button
            type="button"
            onClick={handleMarkPickedUp}
            disabled={isPending}
            className="rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-gold-ink disabled:opacity-60"
          >
            Mark picked up
          </button>
        )}

        {order.status === "out_for_delivery" && mode !== "enter-otp" && (
          <button
            type="button"
            onClick={() => setMode("enter-otp")}
            className="rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-gold-ink"
          >
            Mark delivered
          </button>
        )}
      </div>

      {mode === "assign-rider" && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <input
            value={riderName}
            onChange={(e) => setRiderName(e.target.value)}
            placeholder="Rider name"
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-forest"
          />
          <input
            value={riderPhone}
            onChange={(e) => setRiderPhone(e.target.value)}
            placeholder="Rider phone"
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-forest"
          />
          <button
            type="button"
            onClick={handleAssignRider}
            disabled={isPending}
            className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Dispatching…" : "Dispatch"}
          </button>
        </div>
      )}

      {mode === "enter-otp" && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            placeholder="4-digit code from buyer"
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink tracking-[0.3em] outline-none focus:border-forest"
          />
          <button
            type="button"
            onClick={handleMarkDelivered}
            disabled={isPending}
            className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Confirming…" : "Confirm delivered"}
          </button>
        </div>
      )}
    </li>
  );
}
