"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addProduct } from "../actions";

// Fashion & Clothing's variant picker — Part 1 §4. Keeping this a fixed
// list (not free text) is what makes size filtering possible later without
// a data migration.
const FASHION_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function ProductForm({ slug, category }: { slug: string; category: string }) {
  const [error, setError] = useState<string | null>(null);
  const [sizes, setSizes] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggleSize(size: string) {
    setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (category === "fashion") formData.set("sizes", JSON.stringify(sizes));
    startTransition(async () => {
      // On success this redirects server-side and never returns here.
      const result = await addProduct(slug, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
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

      {category === "fashion" && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Sizes</p>
          <div className="flex flex-wrap gap-2">
            {FASHION_SIZES.map((size) => {
              const selected = sizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  aria-pressed={selected}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    selected
                      ? "border-forest bg-forest text-white"
                      : "border-border bg-surface text-ink-muted"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {category === "food" && (
        <input
          name="section"
          placeholder="Menu section (e.g. Mains, Drinks)"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        />
      )}

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
  );
}
