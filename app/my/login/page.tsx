"use client";

import { Suspense, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { requestLoginCode, verifyLoginCode } from "../actions";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("phone", phone);
      const result = await requestLoginCode(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.phone) setPhone(result.phone);
      setStep("code");
    });
  }

  function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("phone", phone);
      formData.set("code", code);
      // On success this redirects server-side and never returns here.
      const result = await verifyLoginCode(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Sella
        </p>
        <h1 className="mt-1 text-2xl font-bold text-forest-dark">
          {step === "phone" ? "Log in with your phone" : "Enter your code"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {step === "phone"
            ? "No password needed — we'll text you a code."
            : `We sent a code to ${phone}.`}
        </p>

        {step === "phone" ? (
          <form onSubmit={handleRequestCode} className="mt-6 flex flex-col gap-3">
            <input
              type="tel"
              required
              autoFocus
              placeholder="024 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink disabled:opacity-60"
            >
              {isPending ? "Sending…" : "Send me a code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="mt-6 flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              required
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2.5 text-ink tracking-[0.3em] outline-none focus:border-forest"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Checking…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              className="text-xs text-ink-muted underline"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
