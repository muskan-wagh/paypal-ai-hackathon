import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Banknote, Clock3, FolderKanban, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActivityFeed, { type ActivityEvent } from "@/components/activity-feed";
import DemoBadge from "@/components/demo-badge";
import DemoNotice from "@/components/demo-notice";
import EmptyState from "@/components/empty-state";
import MilestoneRow from "@/components/milestone-row";
import PageHeader from "@/components/page-header";
import StatTile from "@/components/stat-tile";
import { Stagger, StaggerItem, Reveal } from "@/components/motion";
import { getDatabase } from "@/db";
import { events, milestones, payouts, projects } from "@/db/schema";
import { isDemoMilestone } from "@/lib/demo";
import { formatMoney } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import type { MilestoneStatus } from "@/lib/state-machine";

export const dynamic = "force-dynamic";

const ACTION_STATUSES = ["DRAFT", "CHECKLISTED", "ACCEPTED", "EVALUATED", "APPROVED"];
const WAITING_STATUSES = ["INVITED", "FUNDED", "SUBMITTED", "REJECTED"];

/** Soft tones for the milestone status distribution bar. */
const STATUS_TONES: Record<MilestoneStatus, string> = {
  DRAFT: "bg-neutral-300",
  CHECKLISTED: "bg-sky-400",
  INVITED: "bg-indigo-400",
  ACCEPTED: "bg-blue-500",
  FUNDED: "bg-emerald-400",
  SUBMITTED: "bg-amber-400",
  EVALUATED: "bg-violet-400",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-400",
  PAID: "bg-neutral-900",
};

export default async function ClientDashboard() {
  const user = await getSessionUser();
  if (!user || user.role !== "client") redirect("/dashboard");
  const db = await getDatabase();

  const myProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.clientId, user.id))
    .orderBy(desc(projects.updatedAt))
    .all();
  const myMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .orderBy(desc(milestones.updatedAt))
    .all();

  const paidRow = await db
    .select({ total: sql<number>`coalesce(sum(${payouts.amountCents}), 0)` })
    .from(payouts)
    .innerJoin(milestones, eq(payouts.milestoneId, milestones.id))
    .where(eq(milestones.clientId, user.id))
    .get();

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
    .where(eq(milestones.clientId, user.id))
    .orderBy(desc(events.id))
    .limit(7)
    .all();

  const actionCount = myMilestones.filter((m) => ACTION_STATUSES.includes(m.status)).length;
  const waitingCount = myMilestones.filter((m) => WAITING_STATUSES.includes(m.status)).length;
  const paidTotal = Number(paidRow?.total ?? 0);
  const committedTotal = myMilestones
    .filter((m) => m.paypalOrderId || m.status !== "DRAFT")
    .reduce((sum, m) => sum + m.amountCents, 0);
  const projectTitleById = new Map(myProjects.map((p) => [p.id, p.title]));
  const hasDemoData = myMilestones.some(isDemoMilestone);

  // Real status distribution for the portfolio bar.
  const statusCounts = new Map<MilestoneStatus, number>();
  for (const m of myMilestones) {
    const key = m.status as MilestoneStatus;
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client workspace"
        title={
          <span className="flex flex-wrap items-center gap-2">
            Welcome back, {user.name.split(" ")[0]}
            {hasDemoData ? <DemoBadge label="Demo workspace" /> : null}
          </span>
        }
        description="Your milestones, escrow funding and payout activity at a glance."
        actions={
          <Link href="/client/projects/new">
            <Button className="rounded-lg font-semibold shadow-sm">
              <Zap className="h-4 w-4" /> New project
            </Button>
          </Link>
        }
      />

      {hasDemoData ? <DemoNotice /> : null}

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatTile
            label="Active projects"
            value={myProjects.length}
            sub={`${myMilestones.length} milestone${myMilestones.length === 1 ? "" : "s"}`}
            icon={FolderKanban}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Needs your action"
            value={actionCount}
            sub="before work can move forward"
            icon={Zap}
            tone={actionCount > 0 ? "amber" : "brand"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Waiting on others"
            value={waitingCount}
            sub="invites, proof or revisions"
            icon={Clock3}
            tone="sky"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Paid out"
            value={paidTotal}
            currency="USD"
            sub={`${formatMoney(committedTotal)} committed in escrow`}
            icon={Banknote}
            tone="emerald"
          />
        </StaggerItem>
      </Stagger>

      {myMilestones.length > 0 ? (
        <Reveal>
          <div className="card-surface rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-900">Milestone pipeline</h2>
              <p className="text-xs text-neutral-400">Live state-machine distribution</p>
            </div>
            <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              {[...statusCounts.entries()].map(([status, count]) => (
                <span
                  key={status}
                  title={`${status} · ${count}`}
                  style={{ width: `${(count / myMilestones.length) * 100}%` }}
                  className={`h-full ${STATUS_TONES[status]}`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {[...statusCounts.entries()].map(([status, count]) => (
                <span key={status} className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${STATUS_TONES[status]}`} />
                  {status} · <span className="font-semibold text-neutral-700">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold tracking-tight text-neutral-900">Milestones</h2>
            {myMilestones.length === 0 && myProjects.length > 0 && (
              <Link href="/client/projects" className="text-sm font-semibold text-brand hover:underline">
                View projects
              </Link>
            )}
          </div>
          <div className="mt-3 space-y-3">
            {myMilestones.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No milestones yet"
                body="Create a project, add a milestone, and AI will draft the acceptance checklist before you fund anything."
                action={
                  <Link href="/client/projects/new">
                    <Button className="rounded-lg font-semibold">Create your first project</Button>
                  </Link>
                }
              />
            ) : (
              myMilestones.map((milestone) => (
                <MilestoneRow
                  key={milestone.id}
                  milestone={milestone}
                  role="client"
                  projectTitle={milestone.projectId ? projectTitleById.get(milestone.projectId) : null}
                />
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold tracking-tight text-neutral-900">Recent activity</h2>
            <Link
              href="/client/payments"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              Payments <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Reveal className="mt-3">
            <div className="card-surface rounded-2xl p-5">
              <ActivityFeed events={recentEvents as ActivityEvent[]} />
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
