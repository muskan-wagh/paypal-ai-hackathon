import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Banknote, Clock3, Inbox, Zap } from "lucide-react";
import InvitationActions from "@/components/invitation-actions";
import MilestoneRow from "@/components/milestone-row";
import StatTile from "@/components/stat-tile";
import { getDatabase } from "@/db";
import { invitations, milestones, payouts } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ACTION_STATUSES = ["FUNDED", "REJECTED"];
const WAITING_STATUSES = ["ACCEPTED", "SUBMITTED", "EVALUATED", "APPROVED"];

export default async function FreelancerDashboard() {
  const user = await getSessionUser();
  if (!user || user.role !== "freelancer") redirect("/dashboard");
  const db = getDatabase();

  const assigned = db
    .select()
    .from(milestones)
    .where(eq(milestones.freelancerId, user.id))
    .orderBy(desc(milestones.updatedAt))
    .all();

  const pendingInvites = db
    .select({
      token: invitations.token,
      message: invitations.message,
      createdAt: invitations.createdAt,
      milestoneId: invitations.milestoneId,
      milestoneTitle: milestones.title,
      amountCents: milestones.amountCents,
      deadline: milestones.deadline,
    })
    .from(invitations)
    .innerJoin(milestones, eq(invitations.milestoneId, milestones.id))
    .where(and(eq(invitations.inviteeEmail, user.email!), eq(invitations.status, "pending")))
    .orderBy(desc(invitations.createdAt))
    .all();

  const earnedRow = db
    .select({ total: sql<number>`coalesce(sum(${payouts.amountCents}), 0)` })
    .from(payouts)
    .innerJoin(milestones, eq(payouts.milestoneId, milestones.id))
    .where(eq(milestones.freelancerId, user.id))
    .get();

  const actionCount = assigned.filter((m) => ACTION_STATUSES.includes(m.status)).length;
  const waitingCount = assigned.filter((m) => WAITING_STATUSES.includes(m.status)).length;
  const earnedTotal = Number(earnedRow?.total ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Assigned milestones, submissions and payout status in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Pending invitations"
          value={pendingInvites.length}
          sub="offers waiting for you"
          icon={Inbox}
        />
        <StatTile
          label="Needs your action"
          value={actionCount}
          sub="submit or resubmit proof"
          icon={Zap}
        />
        <StatTile
          label="In progress"
          value={waitingCount}
          sub="funded or under review"
          icon={Clock3}
        />
        <StatTile
          label="Earned"
          value={formatMoney(earnedTotal)}
          sub="received via PayPal payouts"
          icon={Banknote}
        />
      </div>

      {pendingInvites.length > 0 && (
        <section>
          <h2 className="font-semibold text-neutral-900">Invitations</h2>
          <div className="mt-3 space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.token}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">{invite.milestoneTitle}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatMoney(invite.amountCents)} · deadline {invite.deadline ?? "TBD"}
                    {invite.message ? ` · “${invite.message}”` : ""}
                  </p>
                </div>
                <InvitationActions token={invite.token} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">My milestones</h2>
          <Link
            href="/freelancer/earnings"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Earnings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {assigned.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <p className="font-medium text-neutral-700">No assigned milestones yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                When a client invites you to a milestone, it appears here — with the amount, deadline
                and the exact acceptance checklist you'll be graded on.
              </p>
            </div>
          ) : (
            assigned.map((milestone) => (
              <MilestoneRow key={milestone.id} milestone={milestone} role="freelancer" />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
