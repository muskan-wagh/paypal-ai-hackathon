import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Mail,
  Zap,
} from "lucide-react";
import ActivityFeed, { type ActivityEvent } from "@/components/activity-feed";
import DemoBadge from "@/components/demo-badge";
import DemoNotice from "@/components/demo-notice";
import EmptyState from "@/components/empty-state";
import InvitationActions from "@/components/invitation-actions";
import MilestoneRow from "@/components/milestone-row";
import PageHeader from "@/components/page-header";
import StatTile from "@/components/stat-tile";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { getDatabase } from "@/db";
import { events, invitations, milestones, payouts, projects, users } from "@/db/schema";
import { isDemoMilestone } from "@/lib/demo";
import { formatDate, formatMoney, formatTimestamp } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ACTION_STATUSES = ["FUNDED", "REJECTED"];
const PENDING_PAYMENT_STATUSES = ["EVALUATED", "APPROVED"];

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(`${deadline}T23:59:59`).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default async function FreelancerDashboard() {
  const user = await getSessionUser();
  if (!user || user.role !== "freelancer") redirect("/dashboard");
  const db = await getDatabase();

  const assigned = await db
    .select()
    .from(milestones)
    .where(eq(milestones.freelancerId, user.id))
    .orderBy(desc(milestones.updatedAt))
    .all();

  const pendingInvites = await db
    .select({
      token: invitations.token,
      message: invitations.message,
      createdAt: invitations.createdAt,
      milestoneId: invitations.milestoneId,
      milestoneTitle: milestones.title,
      amountCents: milestones.amountCents,
      currency: milestones.currency,
      deadline: milestones.deadline,
    })
    .from(invitations)
    .innerJoin(milestones, eq(invitations.milestoneId, milestones.id))
    .where(and(eq(invitations.inviteeEmail, user.email!), eq(invitations.status, "pending")))
    .orderBy(desc(invitations.createdAt))
    .all();

  // Project + client context for the milestone cards (joined through the
  // freelancer's own milestones — never other users' data).
  const projectRows = await db
    .selectDistinct({ id: projects.id, title: projects.title })
    .from(projects)
    .innerJoin(milestones, eq(milestones.projectId, projects.id))
    .where(eq(milestones.freelancerId, user.id))
    .all();
  const clientRows = await db
    .selectDistinct({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(milestones, eq(milestones.clientId, users.id))
    .where(eq(milestones.freelancerId, user.id))
    .all();
  const projectTitleById = new Map(projectRows.map((p) => [p.id, p.title]));
  const clientNameById = new Map(clientRows.map((c) => [c.id, c.name]));

  const myPayouts = await db
    .select({ payout: payouts, currency: milestones.currency, milestoneTitle: milestones.title })
    .from(payouts)
    .innerJoin(milestones, eq(payouts.milestoneId, milestones.id))
    .where(eq(milestones.freelancerId, user.id))
    .orderBy(desc(payouts.createdAt))
    .all();

  const recentEvents = await db
    .select({
      id: events.id,
      type: events.type,
      actor: events.actor,
      createdAt: events.createdAt,
      milestoneId: events.milestoneId,
      milestoneTitle: milestones.title,
    })
    .from(events)
    .innerJoin(milestones, eq(events.milestoneId, milestones.id))
    .where(eq(milestones.freelancerId, user.id))
    .orderBy(desc(events.id))
    .limit(7)
    .all();

  const earnedTotal = myPayouts.reduce((sum, row) => sum + row.payout.amountCents, 0);
  const pendingPayments = assigned
    .filter((m) => PENDING_PAYMENT_STATUSES.includes(m.status))
    .reduce((sum, m) => sum + m.amountCents, 0);
  const activeProjects = new Set(
    assigned.filter((m) => m.status !== "PAID").map((m) => m.projectId ?? 0),
  ).size;
  const completedCount = assigned.filter((m) => m.status === "PAID").length;
  const upcoming = assigned
    .filter((m) => m.status !== "PAID" && m.deadline)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, 4);
  const hasDemoData = assigned.some(isDemoMilestone) || pendingInvites.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Freelancer workspace"
        title={
          <span className="flex flex-wrap items-center gap-2">
            Welcome back, {user.name.split(" ")[0]}
            {hasDemoData ? <DemoBadge label="Demo workspace" /> : null}
          </span>
        }
        description="Assigned milestones, submissions and payout status in one place."
      />

      {hasDemoData ? <DemoNotice /> : null}

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatTile
            label="Total earned"
            value={earnedTotal}
            currency="USD"
            sub="received via PayPal payouts"
            icon={Banknote}
            tone="emerald"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Pending payments"
            value={pendingPayments}
            currency="USD"
            sub="evaluated / approved, awaiting release"
            icon={Clock3}
            tone={pendingPayments > 0 ? "amber" : "brand"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Active projects"
            value={activeProjects}
            sub={`${assigned.filter((m) => ACTION_STATUSES.includes(m.status)).length} need your action`}
            icon={Zap}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Completed milestones"
            value={completedCount}
            sub="paid out in full"
            icon={CheckCircle2}
            tone="sky"
          />
        </StaggerItem>
      </Stagger>

      {pendingInvites.length > 0 && (
        <Reveal>
          <section>
            <h2 className="font-semibold tracking-tight text-neutral-900">Invitations</h2>
            <div className="mt-3 space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.token}
                  className="card-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 border-l-brand p-4 sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{invite.milestoneTitle}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      <span className="font-semibold text-neutral-700 tnum">
                        {formatMoney(invite.amountCents, invite.currency)}
                      </span>
                      {" · "}deadline {invite.deadline ?? "TBD"}
                      {invite.message ? ` · “${invite.message}”` : ""}
                    </p>
                  </div>
                  <InvitationActions token={invite.token} />
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold tracking-tight text-neutral-900">My milestones</h2>
            <Link
              href="/freelancer/earnings"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              Earnings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {assigned.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No assigned milestones yet"
                body="When a client invites you to a milestone, it appears here — with the amount, deadline and the exact acceptance checklist you'll be graded on."
              />
            ) : (
              assigned.map((milestone) => (
                <MilestoneRow
                  key={milestone.id}
                  milestone={milestone}
                  role="freelancer"
                  projectTitle={
                    milestone.projectId ? projectTitleById.get(milestone.projectId) ?? null : null
                  }
                  clientName={clientNameById.get(milestone.clientId) ?? null}
                />
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <Reveal>
            <section>
              <h2 className="font-semibold tracking-tight text-neutral-900">Upcoming deadlines</h2>
              <div className="card-surface mt-3 space-y-3 rounded-2xl p-5">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-neutral-500">No open deadlines.</p>
                ) : (
                  upcoming.map((m) => {
                    const days = daysUntil(m.deadline);
                    const overdue = days !== null && days < 0;
                    return (
                      <Link
                        key={m.id}
                        href={`/milestones/${m.id}`}
                        className="flex items-center justify-between gap-3 text-sm transition-colors hover:text-brand"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-neutral-800">{m.title}</span>
                          <span className="text-xs text-neutral-400">{formatDate(m.deadline)}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            overdue
                              ? "bg-red-50 text-red-700"
                              : (days ?? 0) <= 3
                                ? "bg-amber-50 text-amber-700"
                                : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {overdue ? "overdue" : days === 0 ? "due today" : `${days}d left`}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-semibold tracking-tight text-neutral-900">Recent payouts</h2>
              <div className="card-surface mt-3 space-y-3 rounded-2xl p-5">
                {myPayouts.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No payouts yet. Deliver great work — the money follows the approval.
                  </p>
                ) : (
                  myPayouts.slice(0, 4).map((row) => (
                    <div key={row.payout.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-neutral-800">
                          {row.milestoneTitle}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-400">
                          {row.payout.batchId}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold text-emerald-700 tnum">
                          +{formatMoney(row.payout.amountCents, row.currency)}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {formatTimestamp(row.payout.createdAt)}
                        </span>
                      </span>
                    </div>
                  ))
                )}
                <Link
                  href="/freelancer/earnings"
                  className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-brand hover:underline"
                >
                  Full payout history <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section>
              <h2 className="font-semibold tracking-tight text-neutral-900">Recent activity</h2>
              <div className="card-surface mt-3 rounded-2xl p-5">
                <ActivityFeed events={recentEvents as ActivityEvent[]} />
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
