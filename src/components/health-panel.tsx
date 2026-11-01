"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  model: string | null;
  openrouter: { ok: boolean; isFreeTier?: boolean; usage?: number; limit?: number; limitRemaining?: number } | { ok: false; error: string };
  paypal: { ok: boolean; tokenExpiresIn?: number } | { ok: false; error: string };
  db: { ok: boolean; usersCount?: number; milestonesCount?: number } | { ok: false; error: string };
};

/** Phase 8 — small debug/health panel (OpenRouter quota + PayPal + DB). */
export default function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setHealth(j as Health);
      })
      .catch((e) => {
        if (!cancelled) setHealth({ ok: false, model: null, openrouter: { ok: false, error: String(e) }, paypal: { ok: false, error: String(e) }, db: { ok: false, error: String(e) } });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-xs text-neutral-500">Checking system health…</p>;

  const or = health?.openrouter;
  const pp = health?.paypal;
  const db = health?.db;

  return (
    <div className="space-y-1 text-xs">
      <p>
        <span className="font-medium">AI model:</span> {health?.model ?? "—"}
      </p>
      <p>
        <span className="font-medium">OpenRouter:</span>{" "}
        {or && "ok" in or && or.ok ? (
          <>
            connected · free tier {or.isFreeTier ? "yes" : "no"}
            {typeof or.usage === "number" ? ` · usage ${or.usage}` : ""}
            {typeof or.limitRemaining === "number" ? ` · ${or.limitRemaining} free req left today` : ""}
          </>
        ) : (
          <span className="text-red-600">{(or as { error?: string })?.error ?? "error"}</span>
        )}
      </p>
      <p>
        <span className="font-medium">PayPal sandbox:</span>{" "}
        {pp && "ok" in pp && pp.ok ? `token OK (expires in ${pp.tokenExpiresIn ?? "?"}s)` : <span className="text-red-600">{(pp as { error?: string })?.error ?? "error"}</span>}
      </p>
      <p>
        <span className="font-medium">Database:</span>{" "}
        {db && "ok" in db && db.ok ? `${db.usersCount} users · ${db.milestonesCount} milestones` : <span className="text-red-600">{(db as { error?: string })?.error ?? "error"}</span>}
      </p>
    </div>
  );
}
