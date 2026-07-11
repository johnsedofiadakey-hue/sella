import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, otpCodes } from "@/db";
import { hashSecret, verifySecret } from "./crypto";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function generateCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

// Stand-in delivery: Part 3 §2 wires this to the Meta WhatsApp Business Cloud
// API (primary) with Arkesel/Hubtel SMS as fallback. Both need accounts that
// don't exist yet (Part 5 Phase 0), so this just logs the code until they do.
async function sendOtp(phone: string, code: string) {
  console.log(`[otp] ${phone} -> ${code} (expires in 5 min)`);
}

export async function requestOtp(phone: string, purpose: "signup" | "login") {
  const recent = await db.query.otpCodes.findFirst({
    where: eq(otpCodes.phone, phone),
    orderBy: [desc(otpCodes.createdAt)],
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new Error("Please wait a moment before requesting another code.");
  }

  const code = generateCode();
  await db.insert(otpCodes).values({
    phone,
    codeHash: hashSecret(code),
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  await sendOtp(phone, code);
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: "signup" | "login",
): Promise<boolean> {
  const candidate = await db.query.otpCodes.findFirst({
    where: and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.purpose, purpose),
      isNull(otpCodes.consumedAt),
    ),
    orderBy: [desc(otpCodes.createdAt)],
  });
  if (!candidate) return false;
  if (candidate.expiresAt.getTime() < Date.now()) return false;
  // A 6-digit code is only 900,000 possibilities — without this, someone
  // who knows a victim's phone number could brute-force it within the
  // 5-minute TTL. Once locked, the only way forward is requesting a new
  // code (still gated by the resend cooldown above).
  if (candidate.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  if (!verifySecret(code, candidate.codeHash)) {
    await db
      .update(otpCodes)
      .set({ attempts: candidate.attempts + 1 })
      .where(eq(otpCodes.id, candidate.id));
    return false;
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, candidate.id));
  return true;
}
