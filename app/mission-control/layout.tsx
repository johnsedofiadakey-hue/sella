import Link from "next/link";
import { requireStaff } from "@/lib/authz";

// Part 6 §5.4: Mission Control reuses the same brand tokens and component
// library as every other surface, but denser and quieter — this is the
// one surface where clarity beats personality.
export default async function MissionControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();

  return (
    <div className="flex-1 bg-paper">
      <header className="border-b border-border bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <span className="text-sm font-bold text-forest-dark">Mission Control</span>
          <nav className="flex gap-4 text-sm text-ink-muted">
            <Link href="/mission-control" className="hover:text-ink">
              Overview
            </Link>
            <Link href="/mission-control/tenants" className="hover:text-ink">
              Tenants
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
