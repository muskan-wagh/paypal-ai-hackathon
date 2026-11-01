"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { clearSession, createSessionCookie } from "@/lib/session";

/** Persona login — demo-only (no passwords). The secret-sauce validation
 *  (HMAC signing + exp) lives in src/lib/session.ts; role checks stay server-side. */
export async function loginAs(formData: FormData) {
  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId <= 0) redirect("/login");
  const user = getDatabase().select().from(users).where(eq(users.id, userId)).get();
  if (!user) redirect("/login");
  await createSessionCookie(userId);
  redirect("/milestones");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
