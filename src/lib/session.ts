import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { users, type User } from "@/db/schema";

const COOKIE_NAME = "pp_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type SessionPayload = { userId: number; exp: number };

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set in .env — add any long random string.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function encodeSession(userId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 } satisfies SessionPayload),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the userId, or null for any tampered/expired/malformed token. */
export function decodeSession(token: string): number | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (typeof data.userId !== "number" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

/** Call from server actions / route handlers only (writes a cookie). */
export async function createSessionCookie(userId: number) {
  (await cookies()).set({
    name: COOKIE_NAME,
    value: encodeSession(userId),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

/** Server-side session read + role hydration. Verifies the HMAC every time. */
export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = decodeSession(token);
  if (userId === null) return null;
  return getDatabase().select().from(users).where(eq(users.id, userId)).get() ?? null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
