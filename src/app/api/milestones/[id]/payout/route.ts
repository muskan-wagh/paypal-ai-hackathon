import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { milestones, payouts, users } from "@/db/schema";
import { writeEvent } from "@/db/log";
import { getSessionUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";
import { createPayout, spikeErrorResponse } from "@/lib/paypal";

/**
 * Phase 7 — client sends the PayPal Payout. State APPROVED → PAID.
 * Receiver = the freelancer's sandbox PayPal email (seeded from PAYPAL_PAYOUT_RECEIVER).
 * Uses the dedicated US-app payouts credentials when configured.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const milestoneId = Number(id);
  if (!Number.isInteger(milestoneId)) {
    return NextResponse.json({ ok: false, code: "BAD_ID", message: "Invalid milestone id" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED", message: "Log in first" }, { status: 401 });
  }

  const db = getDatabase();
  const milestone = db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
  }
  if (user.role !== "client" || milestone.clientId !== user.id) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the milestone's client can send the payout" }, { status: 403 });
  }
  if (milestone.status !== "APPROVED") {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATE", message: `Milestone must be APPROVED to pay out (currently ${milestone.status})` },
      { status: 409 },
    );
  }
  const freelancer = milestone.freelancerId
    ? db.select().from(users).where(eq(users.id, milestone.freelancerId)).get()
    : null;
  const payoutReceiver = freelancer?.sandboxEmail?.trim();
  if (!payoutReceiver) {
    return NextResponse.json(
      { ok: false, code: "MISSING_RECEIVER", message: "The freelancer has no sandbox PayPal email configured" },
      { status: 400 },
    );
  }

  try {
    const amount = (milestone.amountCents / 100).toFixed(2);
    const payout = await createPayout(payoutReceiver, amount, milestone.currency);
    assertTransition(milestone.status, "PAID");
    const now = Date.now();
    db.insert(payouts)
      .values({
        milestoneId,
        batchId: payout.batch_header.payout_batch_id,
        status: payout.batch_header.batch_status,
        receiver: payoutReceiver,
        amountCents: milestone.amountCents,
        rawJson: JSON.stringify(payout),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    db.update(milestones).set({ status: "PAID", updatedAt: now }).where(eq(milestones.id, milestoneId)).run();
    writeEvent(db, {
      milestoneId,
      type: "PAID",
      actor: user.name,
      payload: { batchId: payout.batch_header.payout_batch_id, status: payout.batch_header.batch_status, amount, receiver: payoutReceiver },
    });

    return NextResponse.json({
      ok: true,
      status: "PAID",
      batchId: payout.batch_header.payout_batch_id,
      batchStatus: payout.batch_header.batch_status,
      receiver: payoutReceiver,
      amount,
    });
  } catch (error) {
    return spikeErrorResponse(error);
  }
}
