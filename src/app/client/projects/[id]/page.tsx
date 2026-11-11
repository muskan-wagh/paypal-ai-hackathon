import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Plus, Wallet } from "lucide-react";
import MilestoneRow from "@/components/milestone-row";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { getDatabase } from "@/db";
import { milestones, projects } from "@/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();

  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");
  const db = getDatabase();

  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) notFound();
  if (project.clientId !== user.id) notFound();

  const projectMilestones = db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(desc(milestones.updatedAt))
    .all();

  const value = projectMilestones.reduce((sum, m) => sum + m.amountCents, 0);
  const earliest = projectMilestones
    .map((m) => m.deadline)
    .filter(Boolean)
    .sort()[0];

  return (
    <div className="space-y-6">
      <Link
        href="/client/projects"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-brand-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <PageHeader
        eyebrow="Project"
        title={project.title}
        description={project.description}
        actions={
          <Link href={`/client/projects/${project.id}/milestones/new`}>
            <Button className="rounded-lg font-semibold shadow-sm">
              <Plus className="h-4 w-4" /> Add milestone
            </Button>
          </Link>
        }
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600">
            <Wallet className="h-3.5 w-3.5 text-brand" />
            {projectMilestones.length} milestone(s) ·{" "}
            <span className="font-semibold tnum">{formatMoney(value)}</span> committed
          </span>
          {earliest ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600">
              <CalendarDays className="h-3.5 w-3.5 text-brand" />
              nearest deadline {formatDate(earliest)}
            </span>
          ) : null}
        </div>
      </PageHeader>

      <div className="space-y-3">
        {projectMilestones.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No milestones in this project yet"
            body="Add a milestone with a brief, amount and deadline. The AI turns your brief into an acceptance checklist before you invite a freelancer."
            action={
              <Link href={`/client/projects/${project.id}/milestones/new`}>
                <Button className="rounded-lg font-semibold">Add your first milestone</Button>
              </Link>
            }
          />
        ) : (
          projectMilestones.map((milestone) => (
            <MilestoneRow key={milestone.id} milestone={milestone} role="client" />
          ))
        )}
      </div>
    </div>
  );
}
