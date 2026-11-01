import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Spike: verify the OpenRouter key + the Zod structured-output path we will use
 * for checklist generation and proof evaluation. Tries the pinned model first,
 * then every model in AI_FALLBACKS.
 */

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

type Usage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, code: "MISSING_OPENROUTER_KEY", message: "OPENROUTER_API_KEY is not set in .env" },
      { status: 500 },
    );
  }

  const models = [
    process.env.AI_MODEL ?? "",
    ...(process.env.AI_FALLBACKS ?? "").split(",").map((m) => m.trim()),
  ].filter(Boolean);
  if (models.length === 0) {
    return NextResponse.json(
      { ok: false, code: "NO_MODEL_PINNED", message: "Set AI_MODEL in .env (e.g. google/gemma-4-31b-it:free)" },
      { status: 500 },
    );
  }

  const openrouter = createOpenRouter({ apiKey });
  const attempts: Array<{ model: string; error: string }> = [];

  for (const model of models) {
    try {
      const { object, usage } = await generateObject({
        model: openrouter(model),
        schema: SpikeVerdict,
        system: SYSTEM,
        prompt: PROMPT,
      });
      const u: Usage = usage as Usage;
      return NextResponse.json({
        ok: true,
        model,
        object,
        tokens: {
          input: u.inputTokens ?? null,
          output: u.outputTokens ?? null,
          total: u.totalTokens ?? null,
        },
      });
    } catch (error) {
      attempts.push({
        model,
        error: error instanceof Error ? `${error.name}: ${error.message.slice(0, 300)}` : String(error).slice(0, 300),
      });
    }
  }

  return NextResponse.json({ ok: false, code: "AI_ALL_MODELS_FAILED", attempts }, { status: 502 });
}
