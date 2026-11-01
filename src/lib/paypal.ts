import { NextResponse } from "next/server";

const API_BASE = "https://api-m.sandbox.paypal.com";

/**
 * Normalized PayPal API error — safe to surface in the spike UI (no secrets).
 * `debugId` is what PayPal support asks for when investigating failures.
 */
export class PaypalError extends Error {
  readonly httpStatus: number;
  readonly code: string;
  readonly details: unknown;
  readonly debugId?: string;

  constructor(init: {
    httpStatus: number;
    code: string;
    message: string;
    details?: unknown;
    debugId?: string;
  }) {
    super(init.message);
    this.name = "PaypalError";
    this.httpStatus = init.httpStatus;
    this.code = init.code;
    this.details = init.details ?? null;
    this.debugId = init.debugId;
  }
}

/**
 * Access tokens are valid ~3–9 h; refresh 5 min before expiry.
 * `payouts` may use a separate sandbox app (PAYPAL_PAYOUT_CLIENT_ID/SECRET) —
 * workaround for the sandbox country restriction on sending payouts.
 */
const tokenCache: Record<"checkout" | "payouts", { value: string; expiresAt: number } | null> = {
  checkout: null,
  payouts: null,
};

type CredsKind = "checkout" | "payouts";

function credentials(credsKind: CredsKind): { id: string; secret: string } {
  const id =
    credsKind === "payouts" && process.env.PAYPAL_PAYOUT_CLIENT_ID
      ? process.env.PAYPAL_PAYOUT_CLIENT_ID
      : process.env.PAYPAL_CLIENT_ID;
  const secret =
    credsKind === "payouts" && process.env.PAYPAL_PAYOUT_CLIENT_SECRET
      ? process.env.PAYPAL_PAYOUT_CLIENT_SECRET
      : process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new PaypalError({
      httpStatus: 500,
      code: "MISSING_CONFIG",
      message:
        "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set in .env — copy them from developer.paypal.com → Apps & Credentials → Sandbox.",
    });
  }
  return { id, secret };
}

async function accessToken(credsKind: CredsKind = "checkout"): Promise<string> {
  const cached = tokenCache[credsKind];
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  const { id, secret } = credentials(credsKind);
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw await normalizeError(res);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache[credsKind] = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };
  return tokenCache[credsKind]!.value;
}

async function normalizeError(res: Response): Promise<PaypalError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error body — keep status/statusText
  }
  const errBody = body as {
    name?: string;
    message?: string;
    debug_id?: string;
    details?: unknown;
  } | null;
  return new PaypalError({
    httpStatus: res.status,
    code: errBody?.name ?? `PAYPAL_HTTP_${res.status}`,
    message: errBody?.message ?? res.statusText,
    details: errBody?.details ?? errBody ?? null,
    debugId: errBody?.debug_id,
  });
}

async function paypalFetch(
  path: string,
  init: { method?: string; body?: string; mockApplicationCode?: string } = {},
  credsKind: CredsKind = "checkout",
) {
  const token = await accessToken(credsKind);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  // Negative testing: forces a specific mocked outcome on the real endpoint.
  if (init.mockApplicationCode) {
    headers["PayPal-Mock-Response"] = JSON.stringify({
      mock_application_codes: init.mockApplicationCode,
    });
  }
  return fetch(`${API_BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
  });
}

/** Orders v2 — create a $X order for the spike funding flow. */
export async function createOrder(input: { amount: string; currency: string }) {
  const res = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: input.currency, value: input.amount },
          description: "ProofPay spike milestone",
        },
      ],
    }),
  });
  if (!res.ok) throw await normalizeError(res);
  return (await res.json()) as { id: string; status: string };
}

/** Payments — capture an approved order. `mockApplicationCode` runs negative testing. */
export async function captureOrder(orderId: string, mockApplicationCode?: string) {
  const res = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    body: "{}",
    mockApplicationCode,
  });
  if (!res.ok) throw await normalizeError(res);
  return (await res.json()) as { id: string; status: string };
}

/** Payouts v1 — direct REST (the server SDK has no Payouts controller — verified).
 *  Uses the optional dedicated payouts credentials (US-country sandbox app). */
export async function createPayout(receiver: string, amount: string, currency = "USD") {
  const res = await paypalFetch("/v1/payments/payouts", {
    method: "POST",
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `proofpay-spike-${Date.now()}`,
        email_subject: "ProofPay milestone payout (sandbox)",
        email_message: "Your milestone was approved and paid (sandbox test).",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: amount, currency },
          receiver,
          note: "Sandbox payout spike",
          sender_item_id: `spike-${Date.now()}`,
        },
      ],
    }),
  }, "payouts");
  if (!res.ok) throw await normalizeError(res);
  return (await res.json()) as {
    batch_header: { payout_batch_id: string; batch_status: string };
  };
}

/** Payouts v1 — poll a batch until every item is not PENDING/UNCLAIMED. */
export async function getPayoutBatch(batchId: string) {
  const res = await paypalFetch(`/v1/payments/payouts/${batchId}`, {}, "payouts");
  if (!res.ok) throw await normalizeError(res);
  return (await res.json()) as {
    batch_header: { payout_batch_id: string; batch_status: string };
    items: Array<{
      payout_item_id: string;
      transaction_status: string;
      transaction_id?: string;
    }>;
  };
}

/** Shared route error → JSON mapper for the spike endpoints. */
export function spikeErrorResponse(error: unknown) {
  if (error instanceof PaypalError) {
    return NextResponse.json(
      {
        ok: false,
        code: error.code,
        message: error.message,
        details: error.details,
        debugId: error.debugId,
      },
      { status: error.httpStatus >= 400 && error.httpStatus <= 599 ? error.httpStatus : 502 },
    );
  }
  return NextResponse.json(
    { ok: false, code: "UNHANDLED", message: error instanceof Error ? error.message : String(error) },
    { status: 500 },
  );
}
