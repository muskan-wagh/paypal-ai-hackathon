"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { clearSession, createSessionCookie } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthFormState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Real registration → bcrypt hash → HMAC session cookie → role dashboard.
 * No role check comes from the browser that we trust: the role enum is validated
 * here and every dashboard server-side re-reads the user row from the DB.
 */
export async function registerUser(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (name.length < 2) return { error: "Enter your full name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (role !== "client" && role !== "freelancer") {
    return { error: "Choose an account type (client or freelancer)." };
  }

  const db = getDatabase();
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) return { error: "An account with this email already exists. Try logging in." };

  const result = db
    .insert(users)
    .values({
      name,
      role,
      email,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    })
    .run();

  await createSessionCookie(Number(result.lastInsertRowid));
  redirect("/dashboard");
}

export async function loginWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = getDatabase().select().from(users).where(eq(users.email, email)).get();
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  await createSessionCookie(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
