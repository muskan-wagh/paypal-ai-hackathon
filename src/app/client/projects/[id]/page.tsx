import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import MilestoneRow from "@/components/milestone-row";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Project</p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{project.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">{project.description}</p>
          <p className="mt-2 text-xs text-neutral-400">
            {projectMilestones.length} milestone(s) · {formatMoney(value)} committed
            {earliest ? ` · nearest deadline ${formatDate(earliest)}` : ""}
          </p>
        </div>
        <Link href={`/client/projects/${project.id}/milestones/new`}>
          <Button className="rounded-lg font-semibold">
            <Plus className="h-4 w-4" /> Add milestone
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {projectMilestones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="font-medium text-neutral-700">No milestones in this project yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
              Add a milestone with a brief, amount and deadline. The AI turns your brief into an
              acceptance checklist before you invite a freelancer.
            </p>
            <Link
              href={`/client/projects/${project.id}/milestones/new`}
              className="mt-4 inline-block"
            >
              <Button className="rounded-lg font-semibold">Add your first milestone</Button>
            </Link>
          </div>
        ) : (
          projectMilestones.map((milestone) => (
            <MilestoneRow key={milestone.id} milestone={milestone} role="client" />
          ))
        )}
      </div>
    </div>
  );
}
