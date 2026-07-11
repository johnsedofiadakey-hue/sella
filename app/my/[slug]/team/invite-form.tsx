"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { inviteTeamMember } from "./actions";

export default function InviteForm({ slug }: { slug: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await inviteTeamMember(slug, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="phone"
          required
          placeholder="Staff phone number"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
        />
        <select
          name="role"
          defaultValue="cashier"
          className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
        >
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
