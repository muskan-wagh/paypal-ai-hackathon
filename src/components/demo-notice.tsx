import DemoBadge from "@/components/demo-badge";

/**
 * Shared amber explainer for seeded demo data — keeps the "this is play money"
 * message consistent across both dashboards.
 */
export default function DemoNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
        <DemoBadge />
      </span>
      <p className="text-sm leading-relaxed text-amber-800">
        <span className="font-semibold">Sample data.</span> This workspace is seeded with demo
        projects so you can explore a complete ProofPay workflow. Records marked{" "}
        <span className="mx-0.5 inline-block align-middle">
          <DemoBadge />
        </span>{" "}
        are sample transactions — PayPal ids are prefixed <code className="text-xs">DEMO-</code> and
        funding/payout calls are disabled for them, so no real money can ever move.
      </p>
    </div>
  );
}
