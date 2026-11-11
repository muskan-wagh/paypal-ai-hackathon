"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Loader2 } from "lucide-react";

type Result = {
  ok: boolean;
  message?: string;
  batchId?: string;
  batchStatus?: string;
  receiver?: string;
  amount?: string;
};

export default function PayoutButton({
  milestoneId,
  amountLabel,
}: {
  milestoneId: number;
  amountLabel: string;
}) {
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
        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgb(0_0_0/0.4)] transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
        {busy ? "Sending payout…" : `Send PayPal payout (${amountLabel})`}
      </button>
      {result?.ok ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ Payout sent — batch {result.batchId} ({result.batchStatus}) → {result.receiver},{" "}
          {result.amount}.
        </p>
      ) : null}
      {result && !result.ok ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
