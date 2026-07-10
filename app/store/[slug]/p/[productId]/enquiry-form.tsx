"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createEnquiry } from "./actions";

export default function EnquiryForm({ slug, productId }: { slug: string; productId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this redirects server-side to a confirmation page.
      const result = await createEnquiry(slug, productId, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <input
        name="buyerName"
        required
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
      <textarea
        name="message"
        rows={3}
        placeholder="Anything the seller should know (optional)"
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
