import type { MilestoneStatus } from "@/lib/state-machine";

/**
 * Role-aware next-step hints shown on dashboards and rows. Pure presentation —
 * the actual gating is the server-side state machine.
 */
export function nextStepFor(
  status: MilestoneStatus,
  role: "client" | "freelancer",
): { label: string; tone: "action" | "waiting" | "done" | "ai" } {
  type Tone = "action" | "waiting" | "done" | "ai";
  const table: Record<MilestoneStatus, Record<"client" | "freelancer", { label: string; tone: Tone }>> = {
    DRAFT: {
      client: { label: "Generate the AI acceptance checklist", tone: "action" },
      freelancer: { label: "Brief in progress — waiting for the client", tone: "waiting" },
    },
    CHECKLISTED: {
      client: { label: "Invite a freelancer", tone: "action" },
      freelancer: { label: "Waiting for your invite", tone: "waiting" },
    },
    INVITED: {
      client: { label: "Waiting for the freelancer to accept", tone: "waiting" },
      freelancer: { label: "You have an invitation waiting", tone: "action" },
    },
    ACCEPTED: {
      client: { label: "Fund this milestone with PayPal", tone: "action" },
      freelancer: { label: "Accepted — waiting for the client to fund", tone: "waiting" },
    },
    FUNDED: {
      client: { label: "Funded — waiting for proof of delivery", tone: "waiting" },
      freelancer: { label: "Submit your proof of delivery", tone: "action" },
    },
    SUBMITTED: {
      client: { label: "Proof received — AI is evaluating", tone: "ai" },
      freelancer: { label: "AI is evaluating your proof", tone: "ai" },
    },
    EVALUATED: {
      client: { label: "Review the AI evaluation & approve", tone: "action" },
      freelancer: { label: "Evaluated — waiting for client review", tone: "waiting" },
    },
    APPROVED: {
      client: { label: "Approved — send the PayPal payout", tone: "action" },
      freelancer: { label: "Approved — payout on its way", tone: "waiting" },
    },
    REJECTED: {
      client: { label: "Revision requested — freelancer revising", tone: "waiting" },
      freelancer: { label: "Changes requested — submit revised proof", tone: "action" },
    },
    PAID: {
      client: { label: "Closed — milestone paid", tone: "done" },
      freelancer: { label: "Paid out via PayPal", tone: "done" },
    },
  };
  return table[status][role];
}
