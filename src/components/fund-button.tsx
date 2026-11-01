"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Json = Record<string, unknown>;

type CaptureState =
  | { phase: "idle" }
  | { phase: "capturing" }
  | { phase: "done"; captureId: string | null; payerEmail: string | null }
  | { phase: "error"; friendly: string };

function issueDetails(json: Json): Array<Record<string, unknown>> {
  const details = json.details;
  return Array.isArray(details) ? (details as Array<Record<string, unknown>>) : [];
}

/** Maps a PayPal error payload to one human sentence (no raw JSON dumps). */
function friendlyPaymentError(json: Json): string {
  const code = typeof json.code === "string" ? json.code : "";
  const issue = issueDetails(json).map((d) => String(d.issue ?? "")).join(",");
  const debugId = typeof json.debugId === "string" ? json.debugId : null;

  if (code === "MISSING_CONFIG") return "Server PayPal credentials missing — contact the demo operator.";
  if (code === "INSTRUMENT_DECLINED" || issue.includes("INSTRUMENT_DECLINED")) {
    return "Your payment method was declined. You can retry — try another card or funding source in the PayPal window.";
  }
  if (issue.includes("PAYER_ACTION_REQUIRED")) {
    return "PayPal needs one more step from you (e.g. confirm a card), then you can retry the funding.";
  }
  if (code === "ORDER_NOT_APPROVED") return "The payment window was closed before approval — click Fund again.";
  if (code === "UNAUTHENTICATED") return "Your session expired — log in again.";
  const base = "PayPal rejected the payment just now.";
  return debugId ? `${base} (PayPal debug id: ${debugId})` : base;
}

export default function FundButton({
  milestoneId,
  paypalClientId,
  currency,
  amountLabel,
}: {
  milestoneId: number;
  paypalClientId: string;
  currency: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [capture, setCapture] = useState<CaptureState>({ phase: "idle" });

  if (!paypalClientId) {
    return (
      <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
        <code>PAYPAL_CLIENT_ID</code> is not configured on the server.
      </p>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId: paypalClientId, currency, intent: "capture" }}>
      <div className="mt-3">
        <PayPalButtons
          createOrder={async () => {
            setCapture({ phase: "idle" });
            const res = await fetch(`/api/milestones/${milestoneId}/orders`, { method: "POST" });
            const json = (await res.json()) as Json;
            if (json.ok !== true) {
              setCapture({ phase: "error", friendly: friendlyPaymentError(json) });
              throw new Error(`Order creation failed: ${String(json.message ?? json.code)}`);
            }
            return String(json.orderId);
          }}
          onApprove={async (data) => {
            setCapture({ phase: "capturing" });
            const res = await fetch(`/api/milestones/${milestoneId}/capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderID: data.orderID }),
            });
            const json = (await res.json()) as Json;
            if (json.ok === true) {
              setCapture({
                phase: "done",
                captureId: typeof json.captureId === "string" ? json.captureId : null,
                payerEmail: typeof json.payerEmail === "string" ? json.payerEmail : null,
              });
              router.refresh();
            } else {
              setCapture({ phase: "error", friendly: friendlyPaymentError(json) });
            }
          }}
          onCancel={() => {
            setCapture({
              phase: "error",
              friendly: "Payment window closed before approval — nothing was charged. You can fund again anytime.",
            });
          }}
          onError={(error) => {
            setCapture({
              phase: "error",
              friendly: error instanceof Error ? error.message : "PayPal script error — retry.",
            });
          }}
        />
      </div>

      {capture.phase === "capturing" ? (
        <p className="mt-3 text-sm text-neutral-600">Capturing your approved payment…</p>
      ) : null}
      {capture.phase === "done" ? (
        <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ {amountLabel} captured into escrow{capture.payerEmail ? ` from ${capture.payerEmail}` : ""}.
          The freelancer can now submit proof.
        </p>
      ) : null}
      {capture.phase === "error" ? (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {capture.friendly}
        </p>
      ) : null}
    </PayPalScriptProvider>
  );
}
