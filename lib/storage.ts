import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

// Local-disk stand-in for Part 3 §2's Cloudflare R2 + on-the-fly resizing.
// Callers only ever get back a public URL, so swapping the backend later —
// R2 first, resizing on top — touches this file and nothing else.
//
// Known limitation: Next.js's production build snapshots /public at build
// time, so files written here after a production build may not be served
// on every deploy target. Acceptable for local dev; not to be relied on
// once R2 is wired in.
async function writeUploadedFile(scopeId: string, file: File, fallbackExt: string): Promise<string> {
  const ext = (file.type.split("/")[1] ?? fallbackExt).replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
  const filename = `${randomBytes(8).toString("hex")}.${ext || fallbackExt}`;
  const dir = path.join(UPLOAD_ROOT, scopeId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${scopeId}/${filename}`;
}

export async function saveUploadedImage(scopeId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Photo must be an image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Photo must be under 5MB.");
  }
  return writeUploadedFile(scopeId, file, "jpg");
}

// Digital Products & Courses (Part 1 §4): the file a buyer downloads after
// payment. No content-type restriction — merchants sell PDFs, zips, audio,
// whatever the course/product actually is.
export async function saveUploadedFile(scopeId: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File must be under 25MB.");
  }
  return writeUploadedFile(scopeId, file, "bin");
}
