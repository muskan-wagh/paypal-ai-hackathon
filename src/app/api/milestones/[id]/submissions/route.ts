import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { files, milestones, submissions } from "@/db/schema";
import { writeEvent } from "@/db/log";
import { getSessionUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";
import { runProofEvaluation, markEvaluated } from "@/lib/evaluate";
import { AIFailedError } from "@/lib/ai";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 4;
const ALLOWED_MIME = /^(image\/[a-zA-Z0-9.+-]+|application\/pdf)$/;

/**
 * Phase 6 — freelancer submits proof (images and/or PDF + notes). The milestone
 * must be FUNDED (first submission) or REJECTED (resubmission). The submission is
 * stored as BLOBs in the DB, then the AI evaluation runs inline. An AI failure
 * leaves the milestone in SUBMITTED — never auto-approve, never lose the proof.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (user.role !== "freelancer" || milestone.freelancerId !== user.id) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Only the assigned freelancer can submit proof" },
      { status: 403 },
    );
  }
  if (milestone.status !== "FUNDED" && milestone.status !== "REJECTED") {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATE", message: `Milestone must be FUNDED or REJECTED to submit (currently ${milestone.status})` },
      { status: 409 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_BODY", message: "Expected multipart/form-data" }, { status: 400 });
  }
  const note = String(form.get("note") ?? "").trim().slice(0, 4000);
  const rawFiles = form.getAll("files").filter((f) => f instanceof File) as File[];
  if (rawFiles.length > MAX_FILES) {
    return NextResponse.json({ ok: false, code: "TOO_MANY_FILES", message: `Maximum ${MAX_FILES} files per submission` }, { status: 400 });
  }
  for (const file of rawFiles) {
    if (file.size === 0) continue;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, code: "FILE_TOO_LARGE", message: `${file.name} exceeds 5 MB` }, { status: 400 });
    }
    if (!ALLOWED_MIME.test(file.type)) {
      return NextResponse.json({ ok: false, code: "BAD_MIME", message: `${file.name} must be an image or PDF` }, { status: 400 });
    }
  }
  if (note.length === 0 && rawFiles.length === 0) {
    return NextResponse.json({ ok: false, code: "EMPTY", message: "Add a note or at least one file" }, { status: 400 });
  }

  const now = Date.now();
  const submission = db
    .insert(submissions)
    .values({ milestoneId, freelancerId: user.id, note, createdAt: now })
    .returning()
    .get();

  for (const file of rawFiles) {
    if (file.size === 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    db.insert(files)
      .values({
        submissionId: submission.id,
        filename: file.name.slice(0, 255),
        mimeType: file.type || "application/octet-stream",
        sizeBytes: buffer.length,
        data: buffer,
        createdAt: now,
      })
      .run();
  }

  assertTransition(milestone.status, "SUBMITTED");
  db.update(milestones)
    .set({ status: "SUBMITTED", updatedAt: now })
    .where(eq(milestones.id, milestoneId))
    .run();
  writeEvent(db, {
    milestoneId,
    type: "SUBMITTED",
    actor: user.name,
    payload: { submissionId: submission.id, files: rawFiles.map((f) => f.name), noteLength: note.length },
  });

  // Run the AI evaluation inline (containment: failure → SUBMITTED + retry button).
  try {
    const outcome = await runProofEvaluation(milestone, submission);
    markEvaluated(db, milestoneId, outcome, user.name);
    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
      evaluationId: outcome.evaluationId,
      verdict: outcome.verdict,
      score: outcome.score,
      summary: outcome.summary,
      model: outcome.model,
      items: outcome.items,
    });
  } catch (error) {
    const attempts = error instanceof AIFailedError ? error.attempts : undefined;
    return NextResponse.json(
      {
        ok: true,
        submissionId: submission.id,
        evaluationFailed: true,
        message: "Proof saved — but AI evaluation failed. Retry evaluation from this page.",
        attempts,
      },
      { status: 200 },
    );
  }
}
