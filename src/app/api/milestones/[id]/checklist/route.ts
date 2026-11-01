import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { checklistItems, milestones } from "@/db/schema";
import { writeEvent } from "@/db/log";
import { getSessionUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";
import {
  AIFailedError,
  ChecklistSchema,
  CHECKLIST_SYSTEM,
  CreditsExhaustedError,
  buildChecklistPrompt,
  generateStructuredWithFallback,
  modelsFromEnv,
  type ChecklistObject,
} from "@/lib/ai";

/**
 * Phase 4 — AI call #1: generate the acceptance checklist for a DRAFT milestone.
 * Guards: session → ownership (client only) → state machine (DRAFT → CHECKLISTED).
 * A total AI failure leaves the milestone in DRAFT — never auto-advance.
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
  if (user.role !== "client" || milestone.clientId !== user.id) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Only the milestone's client can generate its checklist" },
      { status: 403 },
    );
  }
  if (milestone.status !== "DRAFT") {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATE", message: `Checklist already exists (status ${milestone.status})` },
      { status: 409 },
    );
  }

  try {
    const result = await generateStructuredWithFallback({
      models: modelsFromEnv(),
      schema: ChecklistSchema,
      system: CHECKLIST_SYSTEM,
      prompt: buildChecklistPrompt(milestone),
      temperature: 0.2,
    });
    const parsed = result.object as ChecklistObject;

    assertTransition(milestone.status, "CHECKLISTED");
    const now = Date.now();
    parsed.items.forEach((item, index) => {
      db.insert(checklistItems)
        .values({
          milestoneId,
          title: item.title,
          acceptanceCriteria: item.acceptanceCriteria,
          checkType: item.checkType,
          sortOrder: index,
          createdAt: now,
        })
        .run();
    });
    db.update(milestones)
      .set({ status: "CHECKLISTED", updatedAt: now })
      .where(eq(milestones.id, milestoneId))
      .run();
    writeEvent(db, {
      milestoneId,
      type: "CHECKLIST_CREATED",
      actor: "ai",
      payload: { model: result.model, items: parsed.items.length, tokens: result.tokens },
    });

    return NextResponse.json({
      ok: true,
      model: result.model,
      items: parsed.items.length,
      tokens: result.tokens,
    });
  } catch (error) {
    if (error instanceof CreditsExhaustedError) {
      return NextResponse.json(
        { ok: false, code: "CREDITS_EXHAUSTED", message: error.message, usageUrl: error.usageUrl, keyUrl: error.keyUrl },
        { status: 402 },
      );
    }
    if (error instanceof AIFailedError) {
      return NextResponse.json(
        {
          ok: false,
          code: "AI_FAILED",
          message: "AI checklist generation failed on all configured models — the milestone stays in DRAFT.",
          attempts: error.attempts,
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: false, code: "UNHANDLED", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
