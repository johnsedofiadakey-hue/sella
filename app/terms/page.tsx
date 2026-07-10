import Link from "next/link";

// Deliberately not real legal text — Part 3 §7 lists Terms of Service as
// an open legal-foundation item (merchant agreement, prohibited items,
// disputes, refund policy) that needs counsel, not a generated placeholder.
export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-forest-dark">Terms of Service</h1>
      <p className="mt-3 text-sm text-ink-muted">
        This page is coming soon. Sella&apos;s Terms of Service, merchant agreement, and
        refund policy are being drafted with counsel before launch.
      </p>
      <Link href="/" className="mt-4 text-sm font-semibold text-forest underline">
        ← Back home
      </Link>
    </div>
  );
}
