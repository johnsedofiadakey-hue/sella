"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createStore } from "../actions";

// Part 1 §4's eight launch verticals, plus laundry from Part 2 §4.
const CATEGORIES = [
  { value: "general_retail", label: "General Retail" },
  { value: "fashion", label: "Fashion & Clothing" },
  { value: "food", label: "Food & Restaurant" },
  { value: "automobile", label: "Automobile" },
  { value: "groceries", label: "Groceries & Fresh Produce" },
  { value: "electronics", label: "Electronics & Phones" },
  { value: "beauty_services", label: "Beauty, Salon & Services" },
  { value: "digital_products", label: "Digital Products & Courses" },
  { value: "laundry", label: "Laundry & Home Services" },
];

export default function NewStorePage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this redirects server-side and never returns here.
      const result = await createStore(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Pick a category
      </p>
      <h1 className="mt-1 text-2xl font-bold text-forest-dark">What&apos;s your business?</h1>
      <p className="mt-1 text-sm text-ink-muted">
        We&apos;ll build your storefront layout to match how your category actually sells.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          name="businessName"
          required
          autoFocus
          placeholder="Business name"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        />
        <select
          name="category"
          required
          defaultValue=""
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        >
          <option value="" disabled>
            Pick a category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create my store"}
        </button>
      </form>
    </div>
  );
}
