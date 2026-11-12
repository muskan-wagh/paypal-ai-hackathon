import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { declineInvitation } from "@/server/invitations";

type Params = { params: Promise<{ token: string }> };

/** POST /api/invitations/[token]/decline — milestone returns to CHECKLISTED. */
export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  const { token } = await params;
  const result = await declineInvitation({ user, token });
  if (!result.ok) {
    const status =
      result.code === "UNAUTHENTICATED" || result.code === "FORBIDDEN" || result.code === "WRONG_USER"
        ? 403
        : result.code === "NOT_FOUND"
          ? 404
          : result.code === "ALREADY_HANDLED" || result.code === "INVALID_STATE"
            ? 409
            : 400;
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status });
  }
  return NextResponse.json({ ok: true, milestoneId: result.data.milestoneId });
}
