// Minimal normalisation only — real E.164/Ghana-network validation lands
// alongside the actual WhatsApp/SMS provider wiring (Part 3 §2).
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").trim();
}
