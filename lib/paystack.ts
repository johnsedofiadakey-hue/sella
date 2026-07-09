import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Part 2 §2's payments interface: checkout and the webhook only ever talk
// to this file, never to Paystack's API directly, so a second provider
// (or a subaccount/split layer added later) can slot in without touching
// checkout. No live credentials exist yet (Part 5 Phase 0) — every call
// here is written against Paystack's real API contract and fails loudly
// and specifically when PAYSTACK_SECRET_KEY is unset, rather than
// pretending to succeed.

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function requireSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Paystack isn't configured yet (PAYSTACK_SECRET_KEY unset) — pay on delivery is still available.",
    );
  }
  return key;
}

type InitializeTransactionParams = {
  /** Paystack requires an email; buyers only ever give a phone (Part 4 §4),
   * so callers synthesize a placeholder — never shown to the buyer. */
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

type InitializeTransactionResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const secretKey = requireSecretKey();

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountPesewas,
      currency: "GHS",
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Could not start payment.");
  }
  return data.data as InitializeTransactionResult;
}

type VerifyTransactionResult = {
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number;
};

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const secretKey = requireSecretKey();

  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Could not verify payment.");
  }
  return data.data as VerifyTransactionResult;
}

// Paystack signs webhook bodies with HMAC-SHA512 of the raw request body,
// keyed by the secret key — verify against the exact bytes received, not
// a re-serialized JSON.parse/stringify round-trip, or this always fails.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signatureHeader) return false;

  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const givenBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}
