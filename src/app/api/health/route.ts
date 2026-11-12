import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { users, milestones } from "@/db/schema";

/**
 * Phase 8 — small health/debug panel endpoint.
 * Surfaces OpenRouter key validity + daily free quota + PayPal token fetch + DB counts.
 * Never exposes secrets.
 */
export async function GET() {
  const health: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    model: process.env.AI_MODEL ?? null,
    fallbacks: process.env.AI_FALLBACKS ?? null,
    db: null as unknown,
    openrouter: null as unknown,
    paypal: null as unknown,
  };

  // DB counts
  try {
    const db = await getDatabase();
    health.db = {
      ok: true,
      usersCount: (await db.select().from(users).all()).length,
      milestonesCount: (await db.select().from(milestones).all()).length,
    };
  } catch (error) {
    health.db = { ok: false, error: error instanceof Error ? error.message : String(error) };
    health.ok = false;
  }

  // OpenRouter key check + daily free quota
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = (await res.json()) as { data?: Record<string, unknown>; error?: unknown };
    if (!res.ok) throw new Error(`OpenRouter /key returned ${res.status}`);
    const data = body.data ?? {};
    health.openrouter = {
      ok: true,
      isFreeTier: data.is_free_tier ?? null,
      usage: data.usage ?? null,
      limit: data.limit ?? null,
      limitRemaining: data.limit_remaining ?? null,
      rateLimit: data.rate_limit ?? null,
    };
  } catch (error) {
    health.openrouter = { ok: false, error: error instanceof Error ? error.message : String(error) };
    health.ok = false;
  }

  // PayPal token fetch (proves credentials work)
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("PAYPAL_CLIENT_ID/SECRET not set");
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`PayPal OAuth returned ${res.status}`);
    const body = (await res.json()) as { expires_in?: number };
    health.paypal = { ok: true, tokenExpiresIn: body.expires_in ?? null };
  } catch (error) {
    health.paypal = { ok: false, error: error instanceof Error ? error.message : String(error) };
    health.ok = false;
  }

  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
