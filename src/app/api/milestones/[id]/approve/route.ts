import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { evaluations, milestones } from "@/db/schema";
import { writeEvent } from "@/db/log";
import { getSessionUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";

/**
 * Phase 7 — client approves the AI-evaluated proof. State EVALUATED → APPROVED.
 * Only the milestone's client may approve; the AI verdict alone never moves money.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const milestoneId = Number(id);
  if (!Number.isInteger(milestoneId)) {
    return NextResponse.json({ ok: false, code: "BAD_ID", message: "Invalid milestone id" }, { status: 400 });
  }

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
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the milestone's client can approve" }, { status: 403 });
  }
  if (milestone.status !== "EVALUATED") {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATE", message: `Milestone must be EVALUATED to approve (currently ${milestone.status})` },
      { status: 409 },
    );
  }

  const latestEval = (
    await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.milestoneId, milestoneId))
      .orderBy(evaluations.createdAt)
      .all()
  ).pop();

  assertTransition(milestone.status, "APPROVED");
  await db.update(milestones).set({ status: "APPROVED", updatedAt: Date.now() }).where(eq(milestones.id, milestoneId)).run();
  await writeEvent(db, {
    milestoneId,
    type: "APPROVED",
    actor: user.name,
    payload: {
      evaluationId: latestEval?.id ?? null,
      score: latestEval?.score ?? null,
      verdict: latestEval?.verdict ?? null,
    },
  });

  return NextResponse.json({ ok: true, status: "APPROVED" });
}
