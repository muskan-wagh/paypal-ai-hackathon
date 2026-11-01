import { NextResponse } from "next/server";
import { createOrder, spikeErrorResponse } from "@/lib/paypal";

/** Spike: create a USD 2.00 sandbox order (server → PayPal, no client involvement). */
export async function POST() {
  try {
    const order = await createOrder({ amount: "2.00", currency: "USD" });
    return NextResponse.json({ ok: true, orderId: order.id, status: order.status });
  } catch (error) {
    return spikeErrorResponse(error);
  }
}
