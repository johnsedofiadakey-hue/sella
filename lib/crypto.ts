import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Slow, salted hash for low-frequency secrets: OTP codes, passwords.
// Not for session tokens — those are checked on every request and need a
// fast hash instead (see hashToken below).
export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(secret, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(secret, salt, 64);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// Fast hash for high-entropy, high-frequency secrets: session tokens.
// The token itself is 256 bits of randomness, so a fast hash is safe here —
// there's nothing for an attacker to brute-force offline.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
