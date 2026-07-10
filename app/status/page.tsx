import { checkDatabase } from "@/lib/health";

// Part 3 §2: "Sentry (free tier) + Uptime Kuma (self-hosted) + a public
// status page." Uptime Kuma polls /api/health from outside the app; this
// page reads the same check directly so it stays correct even before
// Kuma is stood up.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const databaseOk = await checkDatabase();
  const allOk = databaseOk;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <h1 className="text-2xl font-bold text-forest-dark">Sella status</h1>

      <div
        className={`mt-6 rounded-lg border px-4 py-3 ${
          allOk ? "border-success" : "border-danger"
        } bg-forest-tint`}
      >
        <p className={`text-sm font-semibold ${allOk ? "text-success" : "text-danger"}`}>
          {allOk ? "All systems operational" : "We're experiencing issues"}
        </p>
      </div>

      <ul className="mt-6 flex flex-col gap-2 text-sm">
        <li className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
          <span className="text-ink">Database</span>
          <span className={`font-semibold ${databaseOk ? "text-success" : "text-danger"}`}>
            {databaseOk ? "Operational" : "Down"}
          </span>
        </li>
      </ul>

      <p className="mt-6 text-xs text-ink-muted">
        Checked live on load. Uptime history and incident notes live in the externally-hosted
        Uptime Kuma instance once it&apos;s deployed.
      </p>
    </div>
  );
}
