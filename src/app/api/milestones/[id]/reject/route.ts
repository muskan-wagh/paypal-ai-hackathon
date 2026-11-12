import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { milestones } from "@/db/schema";
import { writeEvent } from "@/db/log";
import { getSessionUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";

/**
 * Phase 7 — client rejects the AI-evaluated proof with notes. State EVALUATED → REJECTED.
 * The freelancer can then resubmit (REJECTED → SUBMITTED). Notes live in the event payload.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const milestoneId = Number(id);
  if (!Number.isInteger(milestoneId)) {
    return NextResponse.json({ ok: false, code: "BAD_ID", message: "Invalid milestone id" }, { status: 400 });
  }

  let body: { notes?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // empty body → default notes
  }
  const notes = (body.notes ?? "").trim().slice(0, 2000) || "No specific notes provided.";

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  }

  const db = await getDatabase();
  const milestone = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
  }
  if (user.role !== "client" || milestone.clientId !== user.id) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the milestone's client can reject" }, { status: 403 });
  }
  if (milestone.status !== "EVALUATED") {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATE", message: `Milestone must be EVALUATED to reject (currently ${milestone.status})` },
      { status: 409 },
    );
  }

  assertTransition(milestone.status, "REJECTED");
  await db.update(milestones).set({ status: "REJECTED", updatedAt: Date.now() }).where(eq(milestones.id, milestoneId)).run();
  await writeEvent(db, {
    milestoneId,
    type: "REJECTED",
    actor: user.name,
    payload: { notes },
  });

  return NextResponse.json({ ok: true, status: "REJECTED" });
}
