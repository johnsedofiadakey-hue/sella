"use client";

import { useState, useTransition, type FormEvent } from "react";
import { placeOrder } from "./actions";

export default function CheckoutForm({
  slug,
  canPayWithPaystack,
  isInstantDelivery,
}: {
  slug: string;
  canPayWithPaystack: boolean;
  isInstantDelivery: boolean;
}) {
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  // Paystack only ever appears as a choice once it's actually wired up —
  // no disabled "coming soon" option sitting in the UI.
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "paystack">(
    canPayWithPaystack ? "paystack" : "cod",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this redirects server-side — to the tracking page for
      // COD, or to Paystack's hosted checkout page for card/MoMo.
      const result = await placeOrder(slug, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <input
        name="buyerName"
        required
        autoFocus
        placeholder="Your name"
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      />
      <input
        name="buyerPhone"
        required
        type="tel"
        placeholder="024 123 4567"
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      />

      {isInstantDelivery ? (
        <input type="hidden" name="fulfillmentType" value="instant" />
      ) : (
        <>
          <div className="flex gap-2">
            {(["delivery", "pickup"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFulfillment(option)}
                className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold capitalize ${
                  fulfillment === option
                    ? "border-forest bg-forest text-white"
                    : "border-border bg-surface text-ink-muted"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <input type="hidden" name="fulfillmentType" value={fulfillment} />

          {fulfillment === "delivery" && (
            <>
              <input
                name="deliveryArea"
                required
                placeholder="Area (e.g. Osu, Accra)"
                className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
              />
              <input
                name="deliveryLandmark"
                required
                placeholder="Landmark (e.g. blue kiosk opposite GCB bank)"
                className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
              />
              <input
                name="deliveryGpsCode"
                placeholder="GhanaPost GPS code (optional)"
                className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
              />
            </>
          )}
        </>
      )}

      {isInstantDelivery ? (
        canPayWithPaystack ? (
          <div className="rounded-md border border-border bg-forest-tint p-3 text-sm text-forest-dark">
            Pay by MoMo or card — instant delivery needs payment up front, so pay on delivery
            isn&apos;t offered here.
          </div>
        ) : (
          <div className="rounded-md border border-danger bg-forest-tint p-3 text-sm text-danger">
            Card/MoMo payment isn&apos;t set up yet — digital products need payment before
            delivery, so ordering isn&apos;t available right now.
          </div>
        )
      ) : canPayWithPaystack ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("paystack")}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold ${
              paymentMethod === "paystack"
                ? "border-forest bg-forest text-white"
                : "border-border bg-surface text-ink-muted"
            }`}
          >
            MoMo or card
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("cod")}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold ${
              paymentMethod === "cod"
                ? "border-forest bg-forest text-white"
                : "border-border bg-surface text-ink-muted"
            }`}
          >
            Pay on delivery
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-forest-tint p-3 text-sm text-forest-dark">
          Pay on delivery — cash or MoMo to your rider.
        </div>
      )}
      <input
        type="hidden"
        name="paymentMethod"
        value={isInstantDelivery ? "paystack" : paymentMethod}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending || (isInstantDelivery && !canPayWithPaystack)}
        className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
      >
        {isPending ? "Placing order…" : "Place order"}
      </button>
    </form>
  );
}
