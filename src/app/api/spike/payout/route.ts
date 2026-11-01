import { NextResponse } from "next/server";
import { createPayout, getPayoutBatch, spikeErrorResponse } from "@/lib/paypal";

const MISSING_RECEIVER_MESSAGE =
  "PAYPAL_PAYOUT_RECEIVER is not set in .env — add your sandbox personal account email " +
  "(sb-...@personal.example.com from developer.paypal.com → Testing Tools → Sandbox Accounts), " +
  "restart the dev server, then retry.";

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
      batchId: payout.batch_header.batch_id,
      status: payout.batch_header.batch_status,
      next: `Poll with: curl "http://localhost:3000/api/spike/payout?id=${payout.batch_header.batch_id}"`,
    });
  } catch (error) {
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
      batchId: batch.batch_header.batch_id,
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
