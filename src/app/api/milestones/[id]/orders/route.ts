import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { milestones } from "@/db/schema";
import { writeEvent } from "@/db/log";
import { getSessionUser } from "@/lib/session";
import { isDemoMilestone } from "@/lib/demo";
import { createOrder, spikeErrorResponse } from "@/lib/paypal";

/**
 * Phase 5 — client creates the PayPal order for a CHECKLISTED milestone.
 * No state change yet: DRAFT→CHECKLISTED→FUNDED advances only on capture.
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

  const db = await getDatabase();
  const milestone = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
  }
  if (user.role !== "client" || milestone.clientId !== user.id) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Only the milestone's client can fund it" },
      { status: 403 },
    );
  }
  if (milestone.status !== "ACCEPTED") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATE",
        message: `Milestone must be ACCEPTED (freelancer bound via invite) to fund — currently ${milestone.status}`,
      },
      { status: 409 },
    );
  }
  // Hard guard: seeded demo records must NEVER reach PayPal. The demo shows
  // escrow via clearly-labelled sample order ids (DEMO- prefix).
  if (isDemoMilestone(milestone)) {
    return NextResponse.json(
      {
        ok: false,
        code: "DEMO_RECORD",
        message:
          "This is a seeded demo milestone (sample data). Funding is disabled for demo records so they can never trigger a real PayPal order.",
      },
      { status: 409 },
    );
  }

  try {
    const amount = (milestone.amountCents / 100).toFixed(2);
    const order = await createOrder({
      amount,
      currency: milestone.currency,
      referenceId: `proofpay-milestone-${milestoneId}`,
    });

    await db.update(milestones)
      .set({ paypalOrderId: order.id, updatedAt: Date.now() })
      .where(eq(milestones.id, milestoneId))
      .run();
    await writeEvent(db, {
      milestoneId,
      type: "ORDER_CREATED",
      actor: user.name,
      payload: { orderId: order.id, amount },
    });

    return NextResponse.json({ ok: true, orderId: order.id, status: order.status, amount });
  } catch (error) {
    return spikeErrorResponse(error);
  }
}
