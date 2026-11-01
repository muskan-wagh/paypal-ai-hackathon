"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === "approve" ? "Approving…" : "Approve & release"}
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={busy !== null || notes.trim().length === 0}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        >
          {busy === "reject" ? "Rejecting…" : "Request changes (needs notes)"}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Rejection notes for the freelancer (required to reject)…"
        rows={2}
        className="w-full rounded border border-neutral-300 p-2 text-sm"
      />
      {result && !result.ok ? (
        <p className="text-sm text-red-700">{result.message}</p>
      ) : null}
    </div>
  );
}
