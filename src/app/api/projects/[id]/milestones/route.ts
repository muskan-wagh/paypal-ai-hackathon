import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createMilestone } from "@/server/projects";

type Params = { params: Promise<{ id: string }> };

/** POST /api/projects/[id]/milestones — create a DRAFT milestone inside a project. */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ ok: false, code: "BAD_ID", message: "Invalid project id" }, { status: 400 });
  }

  let body: {
    title?: unknown;
    brief?: unknown;
    amountCents?: unknown;
    currency?: unknown;
    deadline?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_BODY", message: "Expected JSON" }, { status: 400 });
  }
  if (
    typeof body.title !== "string" ||
    typeof body.brief !== "string" ||
    (typeof body.amountCents !== "number" && typeof body.amountCents !== "string")
  ) {
    return NextResponse.json(
      { ok: false, code: "BAD_BODY", message: "title, brief and amountCents are required" },
      { status: 400 },
    );
  }

  let amountCents: number;
  if (typeof body.amountCents === "string") {
    const parsed = Number(body.amountCents.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(parsed)) {
      return NextResponse.json(
        { ok: false, code: "BAD_AMOUNT", message: "Amount must be a number (e.g. 499.00)" },
        { status: 400 },
      );
    }
    amountCents = Math.round(parsed * 100);
  } else {
    amountCents = body.amountCents;
  }

  const result = createMilestone({
    user,
    projectId,
    title: body.title,
    brief: body.brief,
    amountCents,
    currency: typeof body.currency === "string" ? body.currency : "USD",
    deadline: typeof body.deadline === "string" ? body.deadline : null,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, milestoneId: result.data.milestoneId }, { status: 201 });
}
