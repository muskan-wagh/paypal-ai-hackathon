import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

/**
 * Shared OpenRunner-agnostic AI plumbing:
 * pinned model (AI_MODEL) → fallback chain (AI_FALLBACKS) with one bounded
 * retry on upstream 429s (free models share a contended pool — verified live).
 * The provider's Response Healing stays default-ON for malformed JSON.
 */

export type AiAttempt = { model: string; error: string; ms: number };

export class AIFailedError extends Error {
  readonly attempts: AiAttempt[];

  constructor(attempts: AiAttempt[]) {
    super("All configured AI models failed — see attempts");
    this.name = "AIFailedError";
    this.attempts = attempts;
  }
}

type AttemptableError = { statusCode?: unknown; message?: string };

function isRateLimit(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const cast = error as AttemptableError;
  if (cast.statusCode === 429) return true;
  return /\b429\b|rate.?limited/i.test(cast.message ?? "");
}

export function modelsFromEnv(): string[] {
  return [
    process.env.AI_MODEL ?? "",
    ...(process.env.AI_FALLBACKS ?? "").split(",").map((m) => m.trim()),
  ].filter(Boolean);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateStructuredWithFallback(input: {
  models: string[];
  schema: z.ZodType;
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<{
  model: string;
  object: unknown;
  tokens: { input: number | null; output: number | null; total: number | null };
  attempts: AiAttempt[];
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AIFailedError([
      { model: "-", error: "OPENROUTER_API_KEY is not set in .env", ms: 0 },
    ]);
  }
  if (input.models.length === 0) {
    throw new AIFailedError([{ model: "-", error: "AI_MODEL is not set in .env", ms: 0 }]);
  }

  const openrouter = createOpenRouter({ apiKey });
  const attempts: AiAttempt[] = [];

  for (const model of input.models) {
    for (let tryNumber = 0; tryNumber < 2; tryNumber++) {
      const started = Date.now();
      try {
        const { object, usage } = await generateObject({
          model: openrouter(model),
          schema: input.schema,
          system: input.system,
          prompt: input.prompt,
          temperature: input.temperature ?? 0.2,
        });
        const u = usage as { inputTokens?: number | null; outputTokens?: number | null; totalTokens?: number | null };
        return {
          model,
          object,
          tokens: {
            input: u.inputTokens ?? null,
            output: u.outputTokens ?? null,
            total: u.totalTokens ?? null,
          },
          attempts,
        };
      } catch (error) {
        const ms = Date.now() - started;
        attempts.push({
          model,
          error: error instanceof Error ? `${error.name}: ${error.message.slice(0, 300)}` : String(error).slice(0, 300),
          ms,
        });
        if (tryNumber === 0 && isRateLimit(error)) {
          await sleep(2000);
          continue;
        }
        break; // non-retryable, or retry spent → next model in the chain
      }
    }
  }

  throw new AIFailedError(attempts);
}

/** Product schema #1 — AI-generated acceptance checklist (Phase 4). */
export const ChecklistSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        acceptanceCriteria: z.string().min(3).max(300),
        checkType: z.enum(["visual", "document", "scope", "quality"]),
      }),
    )
    .min(4)
    .max(8),
});

export type ChecklistObject = z.infer<typeof ChecklistSchema>;

export const CHECKLIST_SYSTEM =
  "You translate freelance task briefs into objective, machine-checkable acceptance " +
  "checklists for a milestone escrow product. Rules: 4–8 items; every item must be " +
  "verifiable from a screenshot, document, or demo the freelancer will submit; phrase " +
  "acceptanceCriteria as observable facts (not opinions); prefer visual checks; always " +
  "include one scope item and one quality item. Respond only with JSON matching the " +
  "required schema.";

export function buildChecklistPrompt(milestone: {
  title: string;
  brief: string;
  amountCents: number;
  currency: string;
  deadline: string | null;
}): string {
  return [
    `Task title: ${milestone.title}`,
    `Task brief: ${milestone.brief}`,
    `Milestone value: ${(milestone.amountCents / 100).toFixed(2)} ${milestone.currency}`,
    milestone.deadline ? `Deadline: ${milestone.deadline}` : "Deadline: not set",
    "Create the acceptance checklist for this milestone.",
  ].join("\n");
}
