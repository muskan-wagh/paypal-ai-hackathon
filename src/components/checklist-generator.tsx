"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ListChecks } from "lucide-react";

type ChecklistResult = {
  ok: boolean;
  model?: string;
  items?: number;
  message?: string;
  code?: string;
  attempts?: Array<{ model: string; error: string; ms: number }>;
};

/** Phase 4 UI — client-only: "Generate acceptance checklist with AI". */
export default function ChecklistGenerator({ milestoneId }: { milestoneId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ChecklistResult | null>(null);

  async function generate() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/checklist`, { method: "POST" });
      const json = (await res.json()) as ChecklistResult;
      setResult(json);
      if (json.ok) router.refresh();
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgb(0_112_186/0.5)] transition hover:bg-brand-navy disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ListChecks className="h-4 w-4" />
          )}
          {busy ? "AI is writing the checklist… (5–40 s)" : "Generate acceptance checklist with AI"}
        </button>
        <p className="text-xs text-neutral-400">Drafts per-item criteria from your brief.</p>
      </div>

      {result?.ok ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✓ {result.items} items generated via {result.model} — checklist saved, milestone ready to
          invite.
        </p>
      ) : null}
      {result && !result.ok ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.message}
          {result.attempts && result.attempts.length > 0 ? (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer">Model attempts</summary>
              <ul className="mt-1 space-y-1">
                {result.attempts.map((attempt, i) => (
                  <li key={i}>
                    {attempt.model}: {attempt.error}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
