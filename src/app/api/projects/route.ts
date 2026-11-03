import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createProject, listProjectsFor } from "@/server/projects";

/** GET /api/projects — the caller's projects (+ their milestones). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  return NextResponse.json({ ok: true, ...listProjectsFor(user) });
}

/** POST /api/projects — create a project (clients only, server-validated). */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });

  let body: { title?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_BODY", message: "Expected JSON" }, { status: 400 });
  }
  if (typeof body.title !== "string" || typeof (body.description ?? "") !== "string") {
    return NextResponse.json(
      { ok: false, code: "BAD_BODY", message: "title (string) and description (string) are required" },
      { status: 400 },
    );
  }
  const result = createProject({
    user,
    title: body.title,
    description: typeof body.description === "string" ? body.description : "",
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, projectId: result.data.projectId }, { status: 201 });
}
