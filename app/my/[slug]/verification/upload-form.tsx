"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitKycDocument } from "./actions";

export default function UploadForm({
  slug,
  type,
}: {
  slug: string;
  type: "ghana_card" | "business_registration";
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitKycDocument(slug, type, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col items-start gap-2">
      <input
        type="file"
        name="file"
        accept="image/*"
        required
        className="text-sm text-ink-muted"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Uploading…" : "Submit"}
      </button>
    </form>
  );
}
