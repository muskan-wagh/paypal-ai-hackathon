"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Result = { ok: boolean; message?: string; batchId?: string; batchStatus?: string; receiver?: string; amount?: string };

export default function PayoutButton({ milestoneId, amountLabel }: { milestoneId: number; amountLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/payout`, { method: "POST" });
      const json = (await res.json()) as Result;
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
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? "Sending payout…" : `Send PayPal payout (${amountLabel})`}
      </button>
      {result?.ok ? (
        <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ Payout sent — batch {result.batchId} ({result.batchStatus}) → {result.receiver}, {result.amount}.
        </p>
      ) : null}
      {result && !result.ok ? (
        <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{result.message}</p>
      ) : null}
    </div>
  );
}
