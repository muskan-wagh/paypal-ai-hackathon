"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "AI is writing the checklist… (5–40 s)" : "Generate acceptance checklist with AI"}
      </button>

      {result?.ok ? (
        <p className="mt-3 text-sm text-emerald-700">
          ✓ {result.items} items generated via {result.model} — checklist saved, milestone ready to
          fund.
        </p>
      ) : null}
      {result && !result.ok ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
