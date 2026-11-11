"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";

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

const VERDICT_TONE: Record<string, string> = {
  pass: "text-emerald-700",
  fail: "text-red-700",
  partial: "text-amber-700",
};

export default function ProofSubmitForm({ milestoneId }: { milestoneId: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [dragging, setDragging] = useState(false);

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
        className="w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
      />
      <div>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            setFiles(Array.from(e.dataTransfer.files ?? []));
          }}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center transition ${
            dragging
              ? "border-brand bg-accent/60"
              : "border-neutral-300 bg-neutral-50/60 hover:border-brand/50"
          }`}
        >
          <UploadCloud className={`h-6 w-6 ${dragging ? "text-brand" : "text-neutral-400"}`} />
          <span className="text-xs font-medium text-neutral-600">
            Drop files here or <span className="text-brand">browse</span>
          </span>
          <span className="text-[10px] text-neutral-400">Images or PDF · max 4 × 5 MB</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="sr-only"
          />
        </label>
        {files.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {files.map((f) => (
              <li
                key={f.name}
                className="rounded-lg bg-neutral-100 px-2 py-1 text-[11px] text-neutral-600"
              >
                {f.name} ({Math.round(f.size / 1024)} KB)
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy || (files.length === 0 && note.trim().length === 0)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgb(5_150_105/0.5)] transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {busy ? "Uploading + AI evaluating… (10–90 s)" : "Submit proof & run AI evaluation"}
      </button>

      {result?.ok && !result.evaluationFailed ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm">
          <p className="flex items-center gap-2 font-semibold text-emerald-800 tnum">
            {result.verdict?.toUpperCase()} — score {result.score}/100
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-emerald-200">
              <span
                className="block h-full rounded-full bg-emerald-500"
                style={{ width: `${result.score ?? 0}%` }}
              />
            </span>
          </p>
          <p className="mt-1 text-neutral-700">{result.summary}</p>
          {result.items ? (
            <ul className="mt-2 space-y-1 text-xs">
              {result.items.map((item, i) => (
                <li key={i}>
                  <span className={`font-semibold ${VERDICT_TONE[item.verdict] ?? ""}`}>
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
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
            className="mt-2 block rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:border-amber-400"
          >
            Retry AI evaluation
          </button>
        </div>
      ) : null}
      {result && !result.ok ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
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
