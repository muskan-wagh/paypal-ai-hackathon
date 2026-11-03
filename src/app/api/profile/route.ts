import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { isValidEmail } from "@/lib/validate";

/** GET /api/profile — the caller's own profile. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  return NextResponse.json({
    ok: true,
    profile: {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      sandboxEmail: user.sandboxEmail,
    },
  });
}

/** PUT /api/profile — update name/email (+ payout email for freelancers). */
export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });

  let body: { name?: unknown; email?: unknown; sandboxEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_BODY", message: "Expected JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (name.length < 2) {
    return NextResponse.json({ ok: false, code: "BAD_NAME", message: "Name must be at least 2 characters." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, code: "BAD_EMAIL", message: "Enter a valid login email." }, { status: 400 });
  }
  const existing = getDatabase()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ ok: false, code: "EMAIL_TAKEN", message: "That email is already in use." }, { status: 409 });
  }

  const updates: Record<string, string | null> = { name, email };
  if (user.role === "freelancer" && typeof body.sandboxEmail === "string") {
    const sandboxEmail = body.sandboxEmail.trim() || null;
    if (sandboxEmail && !isValidEmail(sandboxEmail)) {
      return NextResponse.json(
        { ok: false, code: "BAD_SANDBOX_EMAIL", message: "Enter a valid PayPal sandbox email." },
        { status: 400 },
      );
    }
    updates.sandboxEmail = sandboxEmail;
  }

  getDatabase().update(users).set(updates).where(eq(users.id, user.id)).run();
  return NextResponse.json({ ok: true });
}
