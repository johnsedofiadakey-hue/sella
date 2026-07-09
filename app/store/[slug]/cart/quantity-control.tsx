"use client";

import { useTransition } from "react";
import { setItemQuantity } from "./actions";

export default function CartQuantityControl({
  slug,
  productId,
  quantity,
}: {
  slug: string;
  productId: string;
  quantity: number;
}) {
  const [isPending, startTransition] = useTransition();

  function change(next: number) {
    startTransition(async () => {
      await setItemQuantity(slug, productId, next);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => change(quantity - 1)}
        disabled={isPending}
        aria-label="Decrease quantity"
        className="h-7 w-7 rounded-full border border-border text-ink-muted disabled:opacity-60"
      >
        −
      </button>
      <span className="w-4 text-center text-sm font-semibold text-ink">{quantity}</span>
      <button
        type="button"
        onClick={() => change(quantity + 1)}
        disabled={isPending}
        aria-label="Increase quantity"
        className="h-7 w-7 rounded-full border border-border text-ink-muted disabled:opacity-60"
      >
        +
      </button>
    </div>
  );
}
