"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Bank } from "@/lib/paystack";
import { linkPayout, verifyAccount } from "./actions";

export default function PayoutForm({
  slug,
  banks,
  defaultBusinessName,
}: {
  slug: string;
  banks: Bank[];
  defaultBusinessName: string;
}) {
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResolvedName(null);
    startTransition(async () => {
      const result = await verifyAccount(slug, bankCode, accountNumber);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setResolvedName(result?.accountName ?? null);
    });
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("businessName", defaultBusinessName);
      formData.set("bankCode", bankCode);
      formData.set("accountNumber", accountNumber);
      const result = await linkPayout(slug, formData);
      if (result?.error) setError(result.error);
    });
  }

  if (resolvedName) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div className="rounded-md border border-forest bg-forest-tint p-3 text-sm text-forest-dark">
          <p className="font-semibold">{resolvedName}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Confirm this is your account before linking it.
          </p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
        >
          {isPending ? "Linking…" : "Confirm & link account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setResolvedName(null);
            setError(null);
          }}
          className="text-xs text-ink-muted underline"
        >
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="mt-6 flex flex-col gap-3">
      <select
        value={bankCode}
        onChange={(e) => setBankCode(e.target.value)}
        required
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      >
        <option value="" disabled>
          Select bank or MoMo network
        </option>
        {banks.map((bank) => (
          <option key={bank.code} value={bank.code}>
            {bank.name}
          </option>
        ))}
      </select>
      <input
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        required
        placeholder="Account or MoMo number"
        className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !bankCode || !accountNumber}
        className="rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Checking…" : "Verify account"}
      </button>
    </form>
  );
}
