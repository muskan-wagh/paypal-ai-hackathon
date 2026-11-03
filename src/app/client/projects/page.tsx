import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDatabase } from "@/db";
import { milestones, projects } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import type { MilestoneStatus } from "@/lib/state-machine";

export const dynamic = "force-dynamic";

const DOT_STYLES: Record<MilestoneStatus, string> = {
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

export default async function ProjectsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");
  const db = getDatabase();

  const rows = db.select().from(projects).where(eq(projects.clientId, user.id)).orderBy(desc(projects.updatedAt)).all();
  const allMilestones = db.select().from(milestones).where(eq(milestones.clientId, user.id)).all();
  const counts = db
    .select({ projectId: milestones.projectId, count: sql<number>`count(*)` })
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .groupBy(milestones.projectId)
    .all();

  const countsByProject = new Map(counts.map((c) => [c.projectId, Number(c.count)]));
  const valueRow = db
    .select({ total: sql<number>`coalesce(sum(${milestones.amountCents}), 0)` })
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .get();
  const totalValue = Number(valueRow?.total ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length} project{rows.length === 1 ? "" : "s"} · {allMilestones.length} milestones ·{" "}
            {formatMoney(totalValue)} committed
          </p>
        </div>
        <Link href="/client/projects/new">
          <Button className="rounded-lg font-semibold">
            <Plus className="h-4 w-4" /> New project
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="font-medium text-neutral-700">No projects yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
            A project groups related milestones. Start with one — e.g. “Brand & marketing site” — and
            add milestones like “Hero redesign”.
          </p>
          <Link href="/client/projects/new" className="mt-4 inline-block">
            <Button className="rounded-lg font-semibold">Create your first project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((project) => {
            const projectMilestones = allMilestones.filter((m) => m.projectId === project.id);
            const value = projectMilestones.reduce((sum, m) => sum + m.amountCents, 0);
            return (
              <Link
                key={project.id}
                href={`/client/projects/${project.id}`}
                className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-brand/50 hover:shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{project.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                      {project.description || "No description"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:text-brand" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {projectMilestones.slice(0, 6).map((m) => (
                    <span
                      key={m.id}
                      title={`${m.title} — ${m.status}`}
                      className={`h-2.5 w-2.5 rounded-full ${DOT_STYLES[m.status as MilestoneStatus] ?? "bg-neutral-300"}`}
                    />
                  ))}
                  {projectMilestones.length === 0 && (
                    <span className="text-[11px] text-neutral-400">No milestones yet</span>
                  )}
                </div>
                <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                  {countsByProject.get(project.id) ?? 0} milestone(s) · {formatMoney(value)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
