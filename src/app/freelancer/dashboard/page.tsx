import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Zap,
} from "lucide-react";
import DemoBadge from "@/components/demo-badge";
import InvitationActions from "@/components/invitation-actions";
import MilestoneRow from "@/components/milestone-row";
import StatTile from "@/components/stat-tile";
import { eventLabel } from "@/components/timeline";
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

  // Project + client context for the milestone cards (joined through the
  // freelancer's own milestones — never other users' data).
  const projectRows = db
    .selectDistinct({ id: projects.id, title: projects.title })
    .from(projects)
    .innerJoin(milestones, eq(milestones.projectId, projects.id))
    .where(eq(milestones.freelancerId, user.id))
    .all();
  const clientRows = db
    .selectDistinct({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(milestones, eq(milestones.clientId, users.id))
    .where(eq(milestones.freelancerId, user.id))
    .all();
  const projectTitleById = new Map(projectRows.map((p) => [p.id, p.title]));
  const clientNameById = new Map(clientRows.map((c) => [c.id, c.name]));

  const myPayouts = db
    .select({ payout: payouts, currency: milestones.currency, milestoneTitle: milestones.title })
    .from(payouts)
    .innerJoin(milestones, eq(payouts.milestoneId, milestones.id))
    .where(eq(milestones.freelancerId, user.id))
    .orderBy(desc(payouts.createdAt))
    .all();

  const recentEvents = db
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
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          {hasDemoData ? <DemoBadge label="Demo workspace" className="mt-1" /> : null}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Assigned milestones, submissions and payout status in one place.
        </p>
      </div>

      {hasDemoData ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Sample data</p>
          <p className="mt-0.5 text-amber-700">
            This workspace is seeded with demo projects so you can explore a complete ProofPay
            workflow. Records marked{" "}
            <span className="mx-0.5 inline-block align-middle">
              <DemoBadge />
            </span>{" "}
            are sample transactions — PayPal ids are prefixed <code>DEMO-</code> and funding/payout
            calls are disabled for them, so no real money can ever move.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total earned"
          value={formatMoney(earnedTotal)}
          sub="received via PayPal payouts"
          icon={Banknote}
        />
        <StatTile
          label="Pending payments"
          value={formatMoney(pendingPayments)}
          sub="evaluated / approved, awaiting release"
          icon={Clock3}
        />
        <StatTile
          label="Active projects"
          value={activeProjects}
          sub={`${assigned.filter((m) => ACTION_STATUSES.includes(m.status)).length} need your action`}
          icon={Zap}
        />
        <StatTile
          label="Completed milestones"
          value={completedCount}
          sub="paid out in full"
          icon={CheckCircle2}
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

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
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
                  and the exact acceptance checklist you&apos;ll be graded on.
                </p>
              </div>
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
          <section>
            <h2 className="font-semibold text-neutral-900">Upcoming deadlines</h2>
            <div className="mt-3 space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
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
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-neutral-800">{m.title}</span>
                        <span className="text-xs text-neutral-400">{formatDate(m.deadline)}</span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
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

          <section>
            <h2 className="font-semibold text-neutral-900">Recent payouts</h2>
            <div className="mt-3 space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
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
                      <span className="font-mono text-[10px] text-neutral-400">{row.payout.batchId}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-emerald-700">
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
                className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-brand hover:underline"
              >
                Full payout history <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-1.5 font-semibold text-neutral-900">
              <CalendarClock className="h-4 w-4 text-brand" /> Recent activity
            </h2>
            <ol className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              {recentEvents.length === 0 && <li className="text-sm text-neutral-500">No activity yet.</li>}
              {recentEvents.map((event) => {
                const meta = eventLabel(event.type);
                return (
                  <li key={event.id} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600"
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/milestones/${event.milestoneId}`}
                        className="text-sm font-medium text-neutral-800 hover:text-brand"
                      >
                        {meta.label}
                        <span className="ml-1 font-normal text-neutral-400">
                          — {event.milestoneTitle}
                        </span>
                      </Link>
                      <p className="text-xs text-neutral-400">
                        {event.actor} · {formatTimestamp(event.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
