"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, ShieldCheck } from "lucide-react";

type Result = { ok: boolean; message?: string };

export default function ApprovalPanel({ milestoneId }: { milestoneId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function approve() {
    setBusy("approve");
    setResult(null);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/approve`, { method: "POST" });
      const json = (await res.json()) as Result;
      setResult(json);
      if (json.ok) router.refresh();
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    setResult(null);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const json = (await res.json()) as Result;
      setResult(json);
      if (json.ok) router.refresh();
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgb(5_150_105/0.5)] transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {busy === "approve" ? "Approving…" : "Approve & release"}
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={busy !== null || notes.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        >
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {busy === "reject" ? "Rejecting…" : "Request changes"}
        </button>
      </div>
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          Revision notes for the freelancer (required to reject)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. the hero section still uses the old logo — see attachment…"
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-sm outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
        />
      </div>
      {result && !result.ok ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
