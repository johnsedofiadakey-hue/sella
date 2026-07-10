import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/health";

// Polled by the self-hosted Uptime Kuma instance from Part 3 §2 — plain
// JSON, no auth, so an external monitor can hit it without credentials.
export async function GET() {
  const databaseOk = await checkDatabase();
  const ok = databaseOk;

  return NextResponse.json(
    {
      status: ok ? "ok" : "error",
      checks: { database: databaseOk },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
