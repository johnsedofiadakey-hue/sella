"use client";

import { useState, useTransition, type FormEvent } from "react";
import { openDispute } from "./actions";

const REASONS = [
  { value: "not_received", label: "Item not received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "refund_refused", label: "Refund refused" },
  { value: "other", label: "Other" },
];

export default function DisputeForm({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this redirects server-side back to the tracking page.
      const result = await openDispute(orderId, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <input
        name="phone"
        required
        type="tel"
        placeholder="Phone number used for this order"
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      />
      <select
        name="reason"
        required
        defaultValue=""
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      >
        <option value="" disabled>
          What went wrong?
        </option>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        name="description"
        required
        rows={4}
        placeholder="Tell us what happened"
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
      >
        {isPending ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
