"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addProduct } from "../actions";

// Fashion & Clothing's variant picker — Part 1 §4. Keeping this a fixed
// list (not free text) is what makes size filtering possible later without
// a data migration.
const FASHION_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// Groceries & Fresh Produce and Laundry & Home Services both price "per
// something" (Part 1 §4 / Part 2 §4) — same unit picker, different vertical.
const UNITS = ["item", "kg", "bunch", "dozen", "load"];

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "uk_used", label: "UK-used" },
];

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

  const isDigital = category === "digital_products";

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
        placeholder={
          category === "automobile" ? "Price (GHS) — shown unless price-on-request" : "Price (GHS)"
        }
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

      {(category === "groceries" || category === "laundry") && (
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Priced per
          <select
            name="unit"
            defaultValue="item"
            className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
      )}

      {category === "electronics" && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Condition
            <select
              name="condition"
              defaultValue="new"
              className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <input
            name="warranty"
            placeholder="Warranty (e.g. 6 months)"
            className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
          />
        </>
      )}

      {(category === "automobile" || category === "electronics") && (
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Specs
          <textarea
            name="specs"
            rows={4}
            placeholder={"One per line, e.g.\nYear: 2019\nMileage: 42,000 km"}
            className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
          />
        </label>
      )}

      {category === "automobile" && (
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" name="priceOnRequest" value="true" className="h-4 w-4" />
          Price on request (hide the price, buyers enquire instead)
        </label>
      )}

      {category === "beauty_services" && (
        <input
          name="durationMins"
          type="number"
          min="5"
          placeholder="Duration (minutes)"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        />
      )}

      {isDigital ? (
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Digital file (sent to buyers after payment)
          <input type="file" name="file" required className="text-sm text-ink-muted" />
        </label>
      ) : (
        <input
          name="stock"
          type="number"
          min="0"
          placeholder="Stock (optional)"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
        />
      )}
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
