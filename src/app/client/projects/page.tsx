import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
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
  const db = await getDatabase();

  const rows = await db.select().from(projects).where(eq(projects.clientId, user.id)).orderBy(desc(projects.updatedAt)).all();
  const allMilestones = await db.select().from(milestones).where(eq(milestones.clientId, user.id)).all();
  const counts = await db
    .select({ projectId: milestones.projectId, count: sql<number>`count(*)` })
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .groupBy(milestones.projectId)
    .all();

  const countsByProject = new Map(counts.map((c) => [c.projectId, Number(c.count)]));
  const valueRow = await db
    .select({ total: sql<number>`coalesce(sum(${milestones.amountCents}), 0)` })
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .get();
  const totalValue = Number(valueRow?.total ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client workspace"
        title="Projects"
        description={`${rows.length} project${rows.length === 1 ? "" : "s"} · ${allMilestones.length} milestones · ${formatMoney(totalValue)} committed`}
        actions={
          <Link href="/client/projects/new">
            <Button className="rounded-lg font-semibold shadow-sm">
              <Plus className="h-4 w-4" /> New project
            </Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          body='A project groups related milestones. Start with one — e.g. "Brand & marketing site" — and add milestones like "Hero redesign".'
          action={
            <Link href="/client/projects/new">
              <Button className="rounded-lg font-semibold">Create your first project</Button>
            </Link>
          }
        />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2" gap={0.07}>
          {rows.map((project) => {
            const projectMilestones = allMilestones.filter((m) => m.projectId === project.id);
            const value = projectMilestones.reduce((sum, m) => sum + m.amountCents, 0);
            return (
              <StaggerItem key={project.id}>
                <Link
                  href={`/client/projects/${project.id}`}
                  className="card-surface card-hover group flex h-full flex-col rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold tracking-[-0.01em] text-neutral-900 transition-colors group-hover:text-brand-navy">
                        {project.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-wash text-brand-navy transition-colors group-hover:bg-brand group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
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
                  <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-600 tnum">
                    <span className="font-semibold text-neutral-800">{countsByProject.get(project.id) ?? 0}</span>{" "}
                    milestone(s) ·{" "}
                    <span className="font-semibold text-neutral-800">{formatMoney(value)}</span>
                  </p>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
