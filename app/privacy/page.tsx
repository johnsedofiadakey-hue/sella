import Link from "next/link";

// Deliberately not real legal text — Part 3 §7 requires Ghana Data
// Protection Commission registration (Act 843) before this can be
// written honestly, not a generated placeholder.
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-forest-dark">Privacy Policy</h1>
      <p className="mt-3 text-sm text-ink-muted">
        This page is coming soon. Sella is completing its Ghana Data Protection Commission
        registration before publishing a privacy policy.
      </p>
      <Link href="/" className="mt-4 text-sm font-semibold text-forest underline">
        ← Back home
      </Link>
    </div>
  );
}
