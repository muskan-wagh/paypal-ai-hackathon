import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createInvitation, listInvitationsFor } from "@/server/invitations";

/** GET /api/invitations — history for the caller (sent for clients, received for freelancers). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  return NextResponse.json({ ok: true, invitations: listInvitationsFor(user) });
}

/** POST /api/invitations — invite a freelancer to a (CHECKLISTED) milestone. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });

  let body: { milestoneId?: unknown; inviteeEmail?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_BODY", message: "Expected JSON" }, { status: 400 });
  }
  const milestoneId = Number(body.milestoneId);
  const inviteeEmail = typeof body.inviteeEmail === "string" ? body.inviteeEmail : "";
  const message = typeof body.message === "string" ? body.message : "";
  if (!Number.isInteger(milestoneId) || milestoneId <= 0) {
    return NextResponse.json({ ok: false, code: "BAD_ID", message: "Invalid milestone id" }, { status: 400 });
  }
  const result = createInvitation({ user, milestoneId, inviteeEmail, message });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.code === "FORBIDDEN" ? 403 : result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 400 },
    );
  }
  return NextResponse.json({ ok: true, token: result.data.token, invitationId: result.data.invitationId }, { status: 201 });
}
