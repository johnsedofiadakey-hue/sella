"use client";

import { useState, useTransition } from "react";
import { payNow } from "./actions";

export default function PayNowButton({ slug }: { slug: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      // On success this redirects server-side to Paystack's hosted page
      // and never returns here.
      const result = await payNow(slug);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
      >
        {isPending ? "Starting…" : "Pay now"}
      </button>
    </div>
  );
}
