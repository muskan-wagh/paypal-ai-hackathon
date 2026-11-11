import type { MilestoneStatus } from "@/lib/state-machine";

/**
 * Demo-record helpers.
 *
 * Demo/sample data is seeded with `npm run db:reset` / `npm run db:reseed`
 * (scripts/demo-data.ts). Every seeded milestone carries `is_demo = 1` and any
 * seeded PayPal identifiers (order ids, capture ids, payout batch ids) start
 * with the DEMO- prefix. The API routes refuse to call PayPal for any record
 * matching these predicates, so demo data can never trigger a real
 * transaction — even accidentally.
 */
export const DEMO_PREFIX = "DEMO-";

export function isDemoMilestone(milestone: {
  isDemo?: number | null;
  paypalOrderId?: string | null;
}): boolean {
  return milestone.isDemo === 1 || (milestone.paypalOrderId?.startsWith(DEMO_PREFIX) ?? false);
}

export function isDemoPayout(payout: { batchId: string }): boolean {
  return payout.batchId.startsWith(DEMO_PREFIX);
}

/** Forward-progress percentage for the dashboard progress bars (REJECTED sits on SUBMITTED). */
export function progressPercent(status: MilestoneStatus): number {
  const map: Record<MilestoneStatus, number> = {
    DRAFT: 5,
    CHECKLISTED: 15,
    INVITED: 25,
    ACCEPTED: 35,
    FUNDED: 45,
    SUBMITTED: 65,
    EVALUATED: 80,
    APPROVED: 90,
    REJECTED: 65,
    PAID: 100,
  };
  return map[status];
}
