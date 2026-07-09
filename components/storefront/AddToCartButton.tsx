"use client";

import { useState, useTransition } from "react";
import { addItemToCart } from "@/app/store/[slug]/cart/actions";

export default function AddToCartButton({ slug, productId }: { slug: string; productId: string }) {
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await addItemToCart(slug, productId);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="w-full rounded-full bg-forest px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
    >
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
