import SpikeClient from "./spike-client";

export const dynamic = "force-dynamic";

export default function SpikePage() {
  const clientId = process.env.PAYPAL_CLIENT_ID ?? "";

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">ProofPay — Phase 2 sandbox spikes</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Everything below runs against the PayPal <strong>sandbox</strong> and OpenRouter free
        models. No real money.
      </p>

      <SpikeClient clientId={clientId} />

      <section className="mt-10 rounded-lg border border-neutral-200 p-4 text-sm">
        <h2 className="font-semibold">Payouts spike (server-driven, no UI)</h2>
        <p className="mt-1 text-neutral-600">
          Requires <code className="rounded bg-neutral-100 px-1">PAYPAL_PAYOUT_RECEIVER</code> in
          <code className="rounded bg-neutral-100 px-1">.env</code> (the sandbox personal account
          email). Then:
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">
{`curl -X POST http://localhost:3000/api/spike/payout

curl "http://localhost:3000/api/spike/payout?id=BATCH_ID"`}
        </pre>
      </section>
    </main>
  );
}
