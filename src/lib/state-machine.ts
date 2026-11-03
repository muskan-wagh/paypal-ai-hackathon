/**
 * ProofPay milestone state machine — enforced SERVER-SIDE only (route handlers
 * and server actions). The client never receives transition logic.
 *
 * DRAFT ──(AI checklist saved)──▶ CHECKLISTED ──(invite sent)──▶ INVITED
 *   ──(freelancer accepts)──▶ ACCEPTED ──(client funds via PayPal)──▶ FUNDED
 *   ──(freelancer submits proof)──▶ SUBMITTED ──(AI evaluates)──▶ EVALUATED
 *   ──(client approves / rejects)──▶ APPROVED | REJECTED ──(PayPal Payouts sent)──▶ PAID
 *
 * REJECTED goes back to SUBMITTED when the freelancer re-submits proof.
 * Any AI failure leaves the state unchanged — never auto-advance (Phase 8 rule).
 */
export const MILESTONE_STATUSES = [
  "DRAFT",
  "CHECKLISTED",
  "INVITED",
  "ACCEPTED",
  "FUNDED",
  "SUBMITTED",
  "EVALUATED",
  "APPROVED",
  "REJECTED",
  "PAID",
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

type TransitionMap = Partial<Record<MilestoneStatus, MilestoneStatus[]>>;

export const ALLOWED_TRANSITIONS: TransitionMap = {
  DRAFT: ["CHECKLISTED"],
  CHECKLISTED: ["INVITED"],
  INVITED: ["ACCEPTED"],
  ACCEPTED: ["FUNDED"],
  FUNDED: ["SUBMITTED"],
  SUBMITTED: ["EVALUATED"],
  EVALUATED: ["APPROVED", "REJECTED"],
  REJECTED: ["SUBMITTED"], // freelancer resubmits proof
  APPROVED: ["PAID"],
  PAID: [],
};

export class InvalidTransitionError extends Error {
  readonly from: MilestoneStatus;
  readonly to: MilestoneStatus;

  constructor(from: string, to: string) {
    super(`Invalid milestone transition ${from} → ${to}`);
    this.name = "InvalidTransitionError";
    this.from = from as MilestoneStatus;
    this.to = to as MilestoneStatus;
  }
}

export function assertTransition(
  from: string,
  to: MilestoneStatus,
): asserts from is MilestoneStatus {
  const allowed = ALLOWED_TRANSITIONS[from as MilestoneStatus];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}
