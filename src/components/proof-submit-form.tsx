"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SubmitResult = {
  ok: boolean;
  submissionId?: number;
  evaluationFailed?: boolean;
  verdict?: string;
  score?: number;
  summary?: string;
  message?: string;
  attempts?: Array<{ model: string; error: string; ms: number }>;
  items?: Array<{ checklistIndex: number; verdict: string; explanation: string }>;
};

export default function ProofSubmitForm({ milestoneId }: { milestoneId: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function submit() {
    if (files.length === 0 && note.trim().length === 0) return;
    setBusy(true);
    setResult(null);
    const form = new FormData();
    form.append("note", note);
    for (const file of files) form.append("files", file);

    try {
      const res = await fetch(`/api/milestones/${milestoneId}/submissions`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as SubmitResult;
      setResult(json);
      if (json.ok && !json.evaluationFailed) router.refresh();
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Briefly describe what you delivered and how to verify it…"
        rows={3}
        className="w-full rounded border border-neutral-300 p-2 text-sm"
      />
      <div>
        <label className="block text-xs font-medium text-neutral-600">
          Proof files (images or PDF, max 4 × 5 MB)
        </label>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="mt-1 w-full text-sm"
        />
        {files.length > 0 ? (
          <p className="mt-1 text-xs text-neutral-500">
            {files.map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`).join(" · ")}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy || (files.length === 0 && note.trim().length === 0)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Uploading + AI evaluating… (10–90 s)" : "Submit proof & run AI evaluation"}
      </button>

      {result?.ok && !result.evaluationFailed ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-800">
            {result.verdict?.toUpperCase()} — score {result.score}/100
          </p>
          <p className="mt-1 text-neutral-700">{result.summary}</p>
          {result.items ? (
            <ul className="mt-2 space-y-1 text-xs">
              {result.items.map((item, i) => (
                <li key={i}>
                  <span
                    className={
                      item.verdict === "pass"
                        ? "font-semibold text-emerald-700"
                        : item.verdict === "fail"
                          ? "font-semibold text-red-700"
                          : "font-semibold text-amber-700"
                    }
                  >
                    {item.verdict.toUpperCase()}
                  </span>{" "}
                  — item #{item.checklistIndex + 1}: {item.explanation}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {result?.evaluationFailed ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {result.message}
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              setResult(null);
              try {
                const res = await fetch(`/api/milestones/${milestoneId}/evaluate`, { method: "POST" });
                const json = (await res.json()) as SubmitResult;
                setResult(json);
                if (json.ok && !json.evaluationFailed) router.refresh();
              } catch (error) {
                setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="mt-2 rounded border border-amber-300 bg-white px-3 py-1 text-xs"
          >
            Retry AI evaluation
          </button>
        </div>
      ) : null}
      {result && !result.ok ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.message}
          {result.attempts && result.attempts.length > 0 ? (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer">Model attempts</summary>
              <ul className="mt-1 space-y-1">
                {result.attempts.map((a, i) => (
                  <li key={i}>
                    {a.model}: {a.error}
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
