import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  checklistItems,
  evaluations,
  evaluationItems,
  files,
  milestones,
  type Milestone,
  type Submission,
} from "@/db/schema";
import { writeEvent } from "@/db/log";
import {
  AIFailedError,
  generateStructuredWithFallback,
  modelsFromEnv,
} from "@/lib/ai";
import { z } from "zod";

/** Product schema #2 — AI proof evaluation against the checklist. */
export const EvaluationSchema = z.object({
  items: z
    .array(
      z.object({
        checklistIndex: z.number().int().min(0).max(15),
        verdict: z.enum(["pass", "partial", "fail"]),
        explanation: z.string().min(5).max(400),
      }),
    )
    .min(1),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(10).max(600),
});

export type EvaluationObject = z.infer<typeof EvaluationSchema>;

export const EVALUATION_SYSTEM =
  "You evaluate submitted freelance proof against a written acceptance checklist. " +
  "Judge ONLY from the provided proof (screenshots, PDF text, notes). Be conservative: " +
  "if the proof does not clearly demonstrate an item, mark it partial or fail and say why. " +
  "Never invent evidence. Respond only with JSON matching the required schema.";

type StoredFile = { filename: string; mimeType: string; data: Buffer };

function describeChecklist(items: Array<{ title: string; acceptanceCriteria: string; checkType: string }>): string {
  return items
    .map((item, i) => `${i}. [${item.checkType}] ${item.title} — acceptance: ${item.acceptanceCriteria}`)
    .join("\n");
}

/** Derive the overall verdict deterministically from items + score (no AI judgement). */
export function deriveOverallVerdict(
  perItem: Array<{ verdict: string }>,
  score: number,
): "pass" | "partial" | "fail" {
  const fails = perItem.filter((i) => i.verdict === "fail").length;
  const partial = perItem.filter((i) => i.verdict === "partial").length;
  if (fails === 0 && partial === 0 && score >= 80) return "pass";
  if (fails === 0 && score >= 50) return "partial";
  return "fail";
}

/** PDF → text (unpdf, pure JS). */
export async function extractPdfText(data: Buffer): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(data as Buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = (Array.isArray(text) ? text.join("\n") : text).slice(0, 8000);
    return joined.length > 0 ? joined : null;
  } catch {
    return null;
  }
}

export type StoredProofFiles = StoredFile[];

/** Loads the submission's stored files. */
export function loadSubmissionFiles(submissionId: number): StoredProofFiles {
  const db = getDatabase();
  const rows = db.select().from(files).where(eq(files.submissionId, submissionId)).all();
  return rows.map((row) => ({
    filename: row.filename,
    mimeType: row.mimeType,
    data: Buffer.from(row.data as Buffer),
  }));
}

export type EvaluationOutcome = {
  ok: true;
  evaluationId: number;
  verdict: "pass" | "partial" | "fail";
  score: number;
  summary: string;
  model: string;
  items: Array<{ checklistIndex: number; verdict: string; explanation: string }>;
};

/** Phase 6 core — runs the AI evaluation for a SUBMITTED milestone. */
export async function runProofEvaluation(milestone: Milestone, submission: Submission): Promise<EvaluationOutcome> {
  const db = getDatabase();

  const checklist = db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.milestoneId, milestone.id))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (checklist.length === 0) {
    throw new AIFailedError([{ model: "-", error: "Milestone has no checklist items", ms: 0 }]);
  }

  const fileRows = loadSubmissionFiles(submission.id);
  const images = fileRows.filter((f) => f.mimeType.startsWith("image/"));
  const pdfBuffers = fileRows.filter((f) => f.mimeType === "application/pdf");
  let pdfText: string | null = null;
  if (pdfBuffers.length > 0) {
    const texts: string[] = [];
    for (const pdf of pdfBuffers.slice(0, 3)) {
      const extracted = await extractPdfText(pdf.data);
      if (extracted) texts.push(`--- PDF: ${pdf.filename} ---\n${extracted}`);
    }
    pdfText = texts.join("\n\n") || null;
  }

  const userText = [
    "Acceptance checklist to verify:",
    describeChecklist(checklist),
    "",
    `Freelancer notes: ${submission.note || "(no notes provided)"}`,
    pdfText ? `\nExtracted PDF text:\n${pdfText}` : "",
    images.length > 0
      ? `\nAttached screenshots (${images.length}): view each image and use it as primary evidence.`
      : "No screenshots attached — judge from notes/PDF text only.",
    "Evaluate EVERY checklist item. Return checklistIndex (0-based) per item.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: userText },
        ...images.slice(0, 4).map((image) => ({
          type: "image" as const,
          image: image.data,
          mimeType: image.mimeType,
        })),
      ],
    },
  ];

  const result = await generateStructuredWithFallback({
    models: modelsFromEnv(),
    schema: EvaluationSchema,
    system: EVALUATION_SYSTEM,
    messages,
    temperature: 0.1,
  });
  const parsed = result.object as EvaluationObject;

  // Normalize: force one entry per checklist item; missing ones → unverifiable.
  const byIndex = new Map<number, { verdict: string; explanation: string }>();
  for (const item of parsed.items) {
    if (item.checklistIndex < checklist.length) byIndex.set(item.checklistIndex, item);
  }
  const normalized = checklist.map((_, index) => {
    const found = byIndex.get(index);
    return found
      ? { checklistIndex: index, verdict: found.verdict, explanation: found.explanation }
      : { checklistIndex: index, verdict: "unverifiable", explanation: "The AI did not return an evaluation for this item." };
  });

  const overall = deriveOverallVerdict(normalized, parsed.score);
  const rawJson = JSON.stringify({ model: result.model, tokens: result.tokens, parsed });

  const now = Date.now();
  const evaluation = db
    .insert(evaluations)
    .values({
      milestoneId: milestone.id,
      submissionId: submission.id,
      verdict: overall,
      score: parsed.score,
      summary: parsed.summary,
      model: result.model,
      rawJson,
      createdAt: now,
    })
    .returning()
    .get();

  for (const item of normalized) {
    db.insert(evaluationItems)
      .values({
        evaluationId: evaluation.id,
        checklistItemId: checklist[item.checklistIndex].id,
        verdict: item.verdict,
        explanation: item.explanation,
      })
      .run();
  }

  return {
    ok: true,
    evaluationId: evaluation.id,
    verdict: overall,
    score: parsed.score,
    summary: parsed.summary,
    model: result.model,
    items: normalized,
  };
}

/** Marks a milestone EVALUATED + writes the ledger entry (caller guards the transition). */
export function markEvaluated(
  db: ReturnType<typeof getDatabase>,
  milestoneId: number,
  outcome: EvaluationOutcome,
  submissionActor: string,
) {
  db.update(milestones)
    .set({ status: "EVALUATED", updatedAt: Date.now() })
    .where(eq(milestones.id, milestoneId))
    .run();
  writeEvent(db, {
    milestoneId,
    type: "EVALUATED",
    actor: "ai",
    payload: {
      evaluationId: outcome.evaluationId,
      verdict: outcome.verdict,
      score: outcome.score,
      model: outcome.model,
      submittedBy: submissionActor,
    },
  });
}
