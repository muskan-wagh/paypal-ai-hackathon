import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Banknote, Clock3, FolderKanban, Zap } from "lucide-react";
import DemoBadge from "@/components/demo-badge";
import MilestoneRow from "@/components/milestone-row";
import StatTile from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { eventLabel } from "@/components/timeline";
import { getDatabase } from "@/db";
import { events, milestones, payouts, projects } from "@/db/schema";
import { isDemoMilestone } from "@/lib/demo";
import { formatMoney, formatTimestamp } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ACTION_STATUSES = ["DRAFT", "CHECKLISTED", "ACCEPTED", "EVALUATED", "APPROVED"];
const WAITING_STATUSES = ["INVITED", "FUNDED", "SUBMITTED", "REJECTED"];

export default async function ClientDashboard() {
  const user = await getSessionUser();
  if (!user || user.role !== "client") redirect("/dashboard");
  const db = getDatabase();

  const myProjects = db
    .select()
    .from(projects)
    .where(eq(projects.clientId, user.id))
    .orderBy(desc(projects.updatedAt))
    .all();
  const myMilestones = db
    .select()
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .orderBy(desc(milestones.updatedAt))
    .all();

  const paidRow = db
    .select({ total: sql<number>`coalesce(sum(${payouts.amountCents}), 0)` })
    .from(payouts)
    .innerJoin(milestones, eq(payouts.milestoneId, milestones.id))
    .where(eq(milestones.clientId, user.id))
    .get();

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
    .where(eq(milestones.clientId, user.id))
    .orderBy(desc(events.id))
    .limit(7)
    .all();

  const actionCount = myMilestones.filter((m) => ACTION_STATUSES.includes(m.status)).length;
  const waitingCount = myMilestones.filter((m) => WAITING_STATUSES.includes(m.status)).length;
  const paidTotal = Number(paidRow?.total ?? 0);
  const projectTitleById = new Map(myProjects.map((p) => [p.id, p.title]));
  const hasDemoData = myMilestones.some(isDemoMilestone);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            {hasDemoData ? <DemoBadge label="Demo workspace" className="mt-1" /> : null}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Your milestones, escrow funding and payout activity at a glance.
          </p>
        </div>
        <Link href="/client/projects/new">
          <Button className="rounded-lg font-semibold">
            <Zap className="h-4 w-4" /> New project
          </Button>
        </Link>
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
          label="Active projects"
          value={myProjects.length}
          sub={`${myMilestones.length} milestone${myMilestones.length === 1 ? "" : "s"}`}
          icon={FolderKanban}
        />
        <StatTile
          label="Needs your action"
          value={actionCount}
          sub="before work can move forward"
          icon={Zap}
        />
        <StatTile
          label="Waiting on others"
          value={waitingCount}
          sub="invites, proof or revisions"
          icon={Clock3}
        />
        <StatTile
          label="Paid out"
          value={formatMoney(paidTotal)}
          sub="via PayPal Payouts"
          icon={Banknote}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">Milestones</h2>
            {myMilestones.length === 0 && myProjects.length > 0 && (
              <Link
                href="/client/projects"
                className="text-sm font-medium text-brand hover:underline"
              >
                View projects
              </Link>
            )}
          </div>
          <div className="mt-3 space-y-3">
            {myMilestones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                <p className="font-medium text-neutral-700">No milestones yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                  Create a project, add a milestone, and AI will draft the acceptance checklist
                  before you fund anything.
                </p>
                <Link href="/client/projects/new" className="mt-4 inline-block">
                  <Button className="rounded-lg font-semibold">Create your first project</Button>
                </Link>
              </div>
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
          <h2 className="font-semibold text-neutral-900">Recent activity</h2>
          <ol className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            {recentEvents.length === 0 && (
              <li className="text-sm text-neutral-500">No activity yet.</li>
            )}
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
          <Link
            href="/client/payments"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            View payment history <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}
