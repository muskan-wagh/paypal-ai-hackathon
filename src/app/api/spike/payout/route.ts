import { NextResponse } from "next/server";
import { PaypalError, createPayout, getPayoutBatch, spikeErrorResponse } from "@/lib/paypal";

const MISSING_RECEIVER_MESSAGE =
  "PAYPAL_PAYOUT_RECEIVER is not set in .env — add your sandbox personal account email " +
  "(sb-...@personal.example.com from developer.paypal.com → Testing Tools → Sandbox Accounts), " +
  "restart the dev server, then retry.";

const PAYOUT_COUNTRY_MESSAGE =
  "Sandbox restriction confirmed: the API caller's own sandbox business account is in a country " +
  "that cannot SEND payouts (e.g. India). Known workaround — use a US-country sandbox app as the " +
  "payout sender: (1) developer.paypal.com → Testing Tools → Sandbox Accounts → Create Account → " +
  "Business, Country: United States; also create a Personal account with Country: United States " +
  "(this becomes the receiver). (2) Apps & Credentials → Sandbox → Create App, select the US " +
  "business account, copy its Client ID + Secret. (3) Put them in .env as PAYPAL_PAYOUT_CLIENT_ID / " +
  "PAYPAL_PAYOUT_CLIENT_SECRET and set PAYPAL_PAYOUT_RECEIVER to the US personal email. " +
  "Checkout (Orders) can keep using your current app credentials.";

/** Spike: send a USD 2.00 payout to the sandbox personal account. */
export async function POST() {
  const receiver = process.env.PAYPAL_PAYOUT_RECEIVER;
  if (!receiver) {
    return NextResponse.json(
      { ok: false, code: "MISSING_RECEIVER", message: MISSING_RECEIVER_MESSAGE },
      { status: 400 },
    );
  }
  try {
    const payout = await createPayout(receiver, "2.00");
    return NextResponse.json({
      ok: true,
      batchId: payout.batch_header.payout_batch_id,
      status: payout.batch_header.batch_status,
      next: `Poll with: curl "http://localhost:3000/api/spike/payout?id=${payout.batch_header.payout_batch_id}"`,
    });
  } catch (error) {
    if (error instanceof PaypalError && error.code === "PAYOUT_NOT_AVAILABLE") {
      return NextResponse.json(
        { ok: false, code: error.code, message: PAYOUT_COUNTRY_MESSAGE, debugId: error.debugId },
        { status: error.httpStatus },
      );
    }
    return spikeErrorResponse(error);
  }
}

/** Spike: poll a payout batch status. ?id=BATCH_ID */
export async function GET(request: Request) {
  const batchId = new URL(request.url).searchParams.get("id");
  if (!batchId) {
    return NextResponse.json(
      { ok: false, code: "MISSING_BATCH_ID", message: "Query param id is required" },
      { status: 400 },
    );
  }
  try {
    const batch = await getPayoutBatch(batchId);
    return NextResponse.json({
      ok: true,
      batchId: batch.batch_header.payout_batch_id,
      batchStatus: batch.batch_header.batch_status,
      items: batch.items.map((item) => ({
        id: item.payout_item_id,
        status: item.transaction_status,
        transactionId: item.transaction_id ?? null,
      })),
    });
  } catch (error) {
    return spikeErrorResponse(error);
  }
}
