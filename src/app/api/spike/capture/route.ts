import { NextResponse } from "next/server";
import { captureOrder, spikeErrorResponse } from "@/lib/paypal";

/**
 * Spike: capture an approved order.
 * Body: { orderID: string, mock?: "INSTRUMENT_DECLINED" | ... }
 * Passing `mock` exercises PayPal's negative-testing header instead of a real capture,
 * which lets us verify this endpoint's plumbing without a human approval first.
 */
export async function POST(request: Request) {
  let body: { orderID?: string; mock?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // empty body → handled below
  }
  if (!body.orderID) {
    return NextResponse.json(
      { ok: false, code: "MISSING_ORDER_ID", message: "JSON body must include orderID" },
      { status: 400 },
    );
  }
  try {
    const capture = await captureOrder(body.orderID, body.mock);
    const nested = capture.purchase_units?.[0]?.payments?.captures?.[0];
    return NextResponse.json({
      ok: true,
      orderId: capture.id,
      orderStatus: capture.status,
      captureId: nested?.id ?? null,
      captureStatus: nested?.status ?? null,
      amount: nested?.amount ?? null,
      payerEmail: capture.payer?.email_address ?? null,
    });
  } catch (error) {
    return spikeErrorResponse(error);
  }
}
