import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AIFailedError,
  generateStructuredWithFallback,
  modelsFromEnv,
} from "@/lib/ai";

const SpikeVerdict = z.object({
  verdict: z.enum(["pass", "partial", "fail"]),
  reason: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

const SYSTEM =
  "You evaluate freelance work against an acceptance checklist. Judge only from the " +
  "provided proof. Respond only through the required JSON schema.";

const PROMPT = [
  'Acceptance checklist item: "The delivered login page has a working email + password form with client-side validation."',
  'Submitted proof text: "Finished the login page; the attached screenshot shows my form with email and password fields and HTML5 validation enabled."',
].join("\n\n");

export async function GET() {
  try {
    const result = await generateStructuredWithFallback({
      models: modelsFromEnv(),
      schema: SpikeVerdict,
      system: SYSTEM,
      prompt: PROMPT,
    });
    return NextResponse.json({
      ok: true,
      model: result.model,
      object: result.object,
      tokens: result.tokens,
      fallbackAttempts: result.attempts.length > 0 ? result.attempts : undefined,
    });
  } catch (error) {
    if (error instanceof AIFailedError) {
      return NextResponse.json({ ok: false, code: "AI_ALL_MODELS_FAILED", attempts: error.attempts }, { status: 502 });
    }
    return NextResponse.json(
      { ok: false, code: "UNHANDLED", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
