"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateBranding } from "../actions";

export default function BrandingForm({
  slug,
  currentPrimary,
  currentAccent,
  currentLogoUrl,
}: {
  slug: string;
  currentPrimary: string;
  currentAccent: string;
  currentLogoUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this redirects server-side and never returns here.
      const result = await updateBranding(slug, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        Logo
        {currentLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local upload stand-in
          <img
            src={currentLogoUrl}
            alt="Current logo"
            className="mb-1 h-12 w-12 rounded-md object-cover"
          />
        )}
        <input type="file" name="logo" accept="image/*" className="text-sm text-ink-muted" />
      </label>

      <label className="flex items-center justify-between text-sm font-medium text-ink">
        Primary colour
        <input
          type="color"
          name="themePrimaryColor"
          defaultValue={currentPrimary}
          className="h-9 w-16 cursor-pointer rounded border border-border"
        />
      </label>

      <label className="flex items-center justify-between text-sm font-medium text-ink">
        Accent colour
        <input
          type="color"
          name="themeAccentColor"
          defaultValue={currentAccent}
          className="h-9 w-16 cursor-pointer rounded border border-border"
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save branding"}
      </button>
    </form>
  );
}
