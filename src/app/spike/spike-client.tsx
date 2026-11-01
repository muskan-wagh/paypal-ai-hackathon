"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useState } from "react";

type SpikeResult = Record<string, unknown> | null;

function ResultBox({ result }: { result: SpikeResult }) {
  if (!result) return null;
  return (
    <pre className="mt-3 max-h-72 overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export default function SpikeClient({ clientId }: { clientId: string }) {
  const [backendResult, setBackendResult] = useState<SpikeResult>(null);
  const [captureResult, setCaptureResult] = useState<SpikeResult>(null);
  const [aiResult, setAiResult] = useState<SpikeResult>(null);
  const [aiBusy, setAiBusy] = useState(false);

  if (!clientId) {
    return (
      <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        <code>PAYPAL_CLIENT_ID</code> is not set — add it to <code>.env</code> and restart the
        dev server.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="font-semibold">Spike 1 — funding flow (order → approval popup → capture)</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
          <li>Click the PayPal button — the real sandbox approval popup opens.</li>
          <li>
            Log in with your sandbox <strong>Personal</strong> account (sb-…@personal.example.com).
          </li>
          <li>Approve USD 2.00 → the app captures server-side and shows the capture result.</li>
        </ol>

        <div className="mt-4">
          <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
            <PayPalButtons
              createOrder={async () => {
                setBackendResult(null);
                setCaptureResult(null);
                const res = await fetch("/api/spike/orders", { method: "POST" });
                const json = (await res.json()) as SpikeResult;
                setBackendResult(json);
                if (!json || json.ok !== true) {
                  throw new Error(
                    `Order creation failed: ${JSON.stringify(json?.message ?? json)}`,
                  );
                }
                return String(json.orderId);
              }}
              onApprove={async (data) => {
                const res = await fetch("/api/spike/capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderID: data.orderID }),
                });
                const json = (await res.json()) as SpikeResult;
                setCaptureResult(json);
              }}
              onCancel={() => {
                setCaptureResult({ ok: true, note: "Approval popup cancelled — no capture attempted." });
              }}
              onError={(err) => {
                setBackendResult({
                  ok: false,
                  code: "PAYPAL_JS_ERROR",
                  message: err instanceof Error ? err.message : String(err),
                });
              }}
            />
          </PayPalScriptProvider>
        </div>

        <p className="mt-3 text-xs text-neutral-500">Order creation:</p>
        <ResultBox result={backendResult} />
        <p className="mt-2 text-xs text-neutral-500">Capture (onApprove):</p>
        <ResultBox result={captureResult} />
      </section>

      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="font-semibold">Spike 3 — OpenRouter structured-output ping</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Runs a miniature proof evaluation (pass/partial/fail verdict + confidence) through the
          pinned model from <code className="rounded bg-neutral-100 px-1">AI_MODEL</code>, with the
          fallback chain on failure. Free models can be slow (~5–30 s).
        </p>
        <button
          type="button"
          disabled={aiBusy}
          onClick={async () => {
            setAiBusy(true);
            setAiResult(null);
            try {
              const res = await fetch("/api/spike/ai");
              setAiResult((await res.json()) as SpikeResult);
            } finally {
              setAiBusy(false);
            }
          }}
          className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {aiBusy ? "Evaluating…" : "Run AI ping"}
        </button>
        <ResultBox result={aiResult} />
      </section>
    </div>
  );
}
