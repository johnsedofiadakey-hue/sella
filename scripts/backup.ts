import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { createGzip } from "node:zlib";
import { AwsClient } from "aws4fetch";

// Part 3 §2: "Nightly pg_dump to R2, 30-day retention, restore tested
// monthly. Non-negotiable — merchant catalogues are their livelihood."
// Run via `npm run db:backup`, scheduled by a nightly cron on the VPS
// (Part 5 doesn't stand up a scheduler service for this — plain cron is
// the boring, correct choice for one nightly job).
const BACKUP_DIR = path.join(process.cwd(), "backups");
const RETENTION_DAYS = 30;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local");
}

function timestampedFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `shoplocal-${stamp}.sql.gz`;
}

async function dumpToFile(databaseUrl: string, destPath: string): Promise<void> {
  await mkdir(path.dirname(destPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const dump = spawn("pg_dump", [databaseUrl, "--no-owner", "--no-privileges"]);
    const gzip = createGzip();
    const out = createWriteStream(destPath);

    dump.stderr.on("data", (chunk) => process.stderr.write(chunk));
    dump.on("error", reject);
    out.on("error", reject);
    out.on("finish", resolve);

    dump.stdout.pipe(gzip).pipe(out);
    dump.on("close", (code) => {
      if (code !== 0) reject(new Error(`pg_dump exited with code ${code}`));
    });
  });
}

// R2 stand-in per lib/storage.ts's pattern: callers get a real upload once
// credentials exist, and a clearly-logged local fallback until they do.
async function uploadToR2(localPath: string, filename: string): Promise<void> {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BACKUP_BUCKET) {
    console.log(`[backup] R2 credentials not set — dump kept locally at ${localPath}`);
    return;
  }

  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BACKUP_BUCKET}/${filename}`;
  const body = await readFile(localPath);

  const response = await client.fetch(endpoint, { method: "PUT", body });
  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status} ${await response.text()}`);
  }
  console.log(`[backup] uploaded to r2://${R2_BACKUP_BUCKET}/${filename}`);
}

// 30-day retention applies to the local fallback directory. Once R2 is
// live, retention there is a bucket lifecycle rule (set once in the
// Cloudflare dashboard), not something this script needs to enforce.
async function pruneOldLocalBackups(): Promise<void> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let files: string[];
  try {
    files = await readdir(BACKUP_DIR);
  } catch {
    return;
  }

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = await stat(filePath);
    if (stats.mtimeMs < cutoff) {
      await unlink(filePath);
      console.log(`[backup] pruned old local backup ${file}`);
    }
  }
}

async function main() {
  const filename = timestampedFilename();
  const localPath = path.join(BACKUP_DIR, filename);

  console.log(`[backup] dumping database to ${localPath}`);
  await dumpToFile(DATABASE_URL!, localPath);

  await uploadToR2(localPath, filename);
  await pruneOldLocalBackups();

  console.log("[backup] done");
}

main().catch((err) => {
  console.error("[backup] failed:", err);
  process.exit(1);
});
