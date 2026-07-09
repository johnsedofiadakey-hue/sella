"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { addProduct } from "../actions";

export default function NewProductPage() {
  const params = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this redirects server-side and never returns here.
      const result = await addProduct(params.slug, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-dark">Add a product</h1>
      <p className="mt-1 text-sm text-ink-muted">Photo, name, price — the rest can wait.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Photo
          <input type="file" name="photo" accept="image/*" className="text-sm text-ink-muted" />
        </label>
        <input
          name="name"
          required
          autoFocus
          placeholder="Product name"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        />
        <input
          name="priceGhs"
          required
          type="number"
          step="0.01"
          min="0"
          placeholder="Price (GHS)"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        />
        <input
          name="stock"
          type="number"
          min="0"
          placeholder="Stock (optional)"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save product"}
        </button>
      </form>
    </div>
  );
}
