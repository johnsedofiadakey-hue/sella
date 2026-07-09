"use client";

import { useState, useTransition } from "react";
import type { Order } from "@/db/schema";
import { assignRider, confirmOrder, markDelivered, markPickedUp } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export default function OrderRow({ slug, order }: { slug: string; order: Order }) {
  const [mode, setMode] = useState<"idle" | "assign-rider" | "enter-otp">("idle");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [otp, setOtp] = useState("");
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
