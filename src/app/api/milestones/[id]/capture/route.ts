import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { milestones } from "@/db/schema";
import { writeEvent } from "@/db/log";
import { getSessionUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";
import { captureOrder, getOrder, spikeErrorResponse } from "@/lib/paypal";

/**
 * Phase 5 — capture the client's approved PayPal order → FUNDED.
 * Integrity checks before a REAL capture:
 *   1. the order belongs to this route's milestone amount (no $2-charge attacks),
 *   2. PayPal shows it APPROVED.
 * `mock` runs PayPal's negative testing (decline path) — state stays ACCEPTED.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const milestoneId = Number(id);
  if (!Number.isInteger(milestoneId)) {
    return NextResponse.json({ ok: false, code: "BAD_ID", message: "Invalid milestone id" }, { status: 400 });
  }

  let body: { orderID?: string; mock?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // missing body → handled below
  }
  if (!body.orderID) {
    return NextResponse.json({ ok: false, code: "MISSING_ORDER_ID", message: "JSON body must include orderID" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  }

  const db = await getDatabase();
  const milestone = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
  }
  if (user.role !== "client" || milestone.clientId !== user.id) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Only the milestone's client can capture the payment" },
      { status: 403 },
    );
  }
  if (milestone.status !== "ACCEPTED") {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATE", message: `Milestone must be ACCEPTED to capture (currently ${milestone.status})` },
      { status: 409 },
    );
  }

  try {
    if (body.mock) {
      // Negative-testing channel: PayPal simulates the outcome; never REAL capture.
      try {
        await captureOrder(body.orderID, body.mock);
        return NextResponse.json({ ok: false, code: "UNEXPECTED_MOCK_SUCCESS", message: "Mock unexpectedly returned success" }, { status: 400 });
      } catch (mockError) {
        return spikeErrorResponse(mockError);
      }
    }

    // Real capture — verify the order first.
    const expectedAmount = (milestone.amountCents / 100).toFixed(2);
    const details = await getOrder(body.orderID);
    if (!details.purchase_units?.[0]?.amount) {
      return NextResponse.json({ ok: false, code: "ORDER_UNKNOWN", message: "Order has no purchase details" }, { status: 400 });
    }
    if (details.purchase_units[0].amount.value !== expectedAmount || details.purchase_units[0].amount.currency_code !== milestone.currency) {
      return NextResponse.json(
        { ok: false, code: "AMOUNT_MISMATCH", message: `Order amount ${details.purchase_units[0].amount.value} ${details.purchase_units[0].amount.currency_code} does not match the milestone (${expectedAmount} ${milestone.currency})` },
        { status: 400 },
      );
    }
    if (details.status !== "APPROVED") {
      return NextResponse.json({ ok: false, code: "ORDER_NOT_APPROVED", message: `PayPal order is ${details.status}, not APPROVED` }, { status: 409 });
    }

    assertTransition(milestone.status, "FUNDED");
    const capture = await captureOrder(body.orderID);
    const nested = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const now = Date.now();

    await db.update(milestones)
      .set({ status: "FUNDED", paypalOrderId: capture.id, paypalCaptureId: nested?.id ?? null, updatedAt: now })
      .where(eq(milestones.id, milestoneId))
      .run();
    await writeEvent(db, {
      milestoneId,
      type: "FUNDED",
      actor: user.name,
      payload: { orderId: capture.id, captureId: nested?.id, amountCents: milestone.amountCents, payerEmail: details.payer?.email_address ?? null },
    });

    return NextResponse.json({
      ok: true,
      orderId: capture.id,
      captureId: nested?.id ?? null,
      captureStatus: nested?.status ?? null,
      amount: expectedAmount,
      payerEmail: details.payer?.email_address ?? null,
    });
  } catch (error) {
    return spikeErrorResponse(error);
  }
}
