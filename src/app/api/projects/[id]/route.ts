import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db";
import { milestones, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getProjectFor } from "@/server/projects";

const BAD_ID = { ok: false, code: "BAD_ID", message: "Invalid project id" };

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json(BAD_ID, { status: 400 });
  }
  const result = getProjectFor(user, projectId);
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status });
  }
  return NextResponse.json({ ok: true, project: result.project, milestones: result.milestones });
}

/** PUT — rename/redescribe, allowed while the project has no milestones beyond DRAFT. */
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json(BAD_ID, { status: 400 });
  }
  const result = getProjectFor(user, projectId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.code === "NOT_FOUND" ? 404 : 403 },
    );
  }
  let body: { title?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_BODY", message: "Expected JSON" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : result.project.title;
  const description =
    typeof body.description === "string" ? body.description.trim() : result.project.description;
  if (title.length < 3) {
    return NextResponse.json(
      { ok: false, code: "BAD_TITLE", message: "Project title must be at least 3 characters." },
      { status: 400 },
    );
  }
  if (result.milestones.some((m) => m.status !== "DRAFT")) {
    return NextResponse.json(
      { ok: false, code: "LOCKED", message: "Projects with active milestones are locked — edit milestones instead." },
      { status: 409 },
    );
  }
  const db = getDatabase();
  db.update(projects)
    .set({ title, description, updatedAt: Date.now() })
    .where(eq(projects.id, projectId))
    .run();
  return NextResponse.json({ ok: true });
}

/** DELETE — only when every milestone is still DRAFT (nothing funded). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json(BAD_ID, { status: 400 });
  }
  const result = getProjectFor(user, projectId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.code === "NOT_FOUND" ? 404 : 403 },
    );
  }
  if (result.milestones.some((m) => m.status !== "DRAFT")) {
    return NextResponse.json(
      { ok: false, code: "LOCKED", message: "Delete the milestones first — funded history cannot be erased." },
      { status: 409 },
    );
  }
  const db = getDatabase();
  for (const milestone of result.milestones) {
    db.delete(milestones).where(eq(milestones.id, milestone.id)).run();
  }
  db.delete(projects).where(eq(projects.id, projectId)).run();
  return NextResponse.json({ ok: true });
}
