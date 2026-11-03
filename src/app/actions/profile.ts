"use server";

import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { isValidEmail } from "@/lib/validate";

export type ProfileFormState = { error?: string; success?: string };

/** Update the caller's own profile: display name, login email, and (freelancers) payout email. */
export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sandboxEmailRaw = String(formData.get("sandboxEmail") ?? "").trim();

  if (name.length < 2) return { error: "Enter your full name." };
  if (!isValidEmail(email) || email === "") return { error: "Enter a valid login email." };

  const db = getDatabase();
  const clash = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, user.id)))
    .get();
  if (clash) return { error: "That login email is already in use by another account." };

  const updates: { name: string; email: string; sandboxEmail?: string | null } = { name, email };
  if (user.role === "freelancer") {
    if (sandboxEmailRaw && !isValidEmail(sandboxEmailRaw)) {
      return { error: "Enter a valid PayPal sandbox email (or leave it empty)." };
    }
    updates.sandboxEmail = sandboxEmailRaw || null;
  }

  db.update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .run();

  return { success: "Profile updated." };
}
