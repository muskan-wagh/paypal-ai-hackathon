import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { milestones, submissions } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";
import { runProofEvaluation, markEvaluated } from "@/lib/evaluate";
import { AIFailedError, CreditsExhaustedError } from "@/lib/ai";

/**
 * Phase 6 — retry the AI evaluation for the latest submission of a SUBMITTED milestone.
 * Allowed for either member of the milestone (client wants a re-read, freelancer wants a retry).
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

  const db = getDatabase();
  const milestone = db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
  }
  if (milestone.clientId !== user.id && milestone.freelancerId !== user.id) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "You are not a member of this milestone" }, { status: 403 });
  }
  if (milestone.status !== "SUBMITTED") {
    return NextResponse.json({ ok: false, code: "INVALID_STATE", message: `Milestone must be SUBMITTED (currently ${milestone.status})` }, { status: 409 });
  }

  const latest = db
    .select()
    .from(submissions)
    .where(eq(submissions.milestoneId, milestoneId))
    .orderBy(submissions.createdAt)
    .all()
    .pop();
  if (!latest) {
    return NextResponse.json({ ok: false, code: "NO_SUBMISSION", message: "No submission to evaluate" }, { status: 409 });
  }

  try {
    const outcome = await runProofEvaluation(milestone, latest);
    assertTransition(milestone.status, "EVALUATED");
    markEvaluated(db, milestoneId, outcome, user.name);
    return NextResponse.json({
      ok: true,
      evaluationId: outcome.evaluationId,
      verdict: outcome.verdict,
      score: outcome.score,
      summary: outcome.summary,
      model: outcome.model,
      items: outcome.items,
    });
  } catch (error) {
    if (error instanceof CreditsExhaustedError) {
      return NextResponse.json(
        { ok: false, code: "CREDITS_EXHAUSTED", message: error.message, usageUrl: error.usageUrl, keyUrl: error.keyUrl },
        { status: 402 },
      );
    }
    const attempts = error instanceof AIFailedError ? error.attempts : undefined;
    return NextResponse.json(
      { ok: true, evaluationFailed: true, message: "AI evaluation failed — retry from this page.", attempts },
      { status: 200 },
    );
  }
}
