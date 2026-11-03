import { NextResponse, type NextRequest } from "next/server";
import { viewInvitation } from "@/server/invitations";

type Params = { params: Promise<{ token: string }> };

/**
 * GET /api/invitations/[token] — public preview of an invitation.
 * Deliberately has no auth: the invite link itself is the capability, and the
 * payload contains only milestone summary fields (title, brief, amount).
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ ok: false, code: "BAD_TOKEN", message: "Invalid invitation token" }, { status: 400 });
  }
  const result = viewInvitation(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 404 });
  }
  return NextResponse.json({ ok: true, invitation: result.data });
}
