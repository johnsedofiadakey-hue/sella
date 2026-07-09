import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, sessions, users } from "@/db";
import { generateToken, hashToken } from "./crypto";

const SESSION_COOKIE = "sl_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string) {
  const token = generateToken();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.tokenHash, hashToken(token)),
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return null;

  return { user, session };
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}
