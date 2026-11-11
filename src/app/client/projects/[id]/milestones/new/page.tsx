import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { NewMilestoneForm } from "@/components/project-forms";
import PageHeader from "@/components/page-header";
import { getDatabase } from "@/db";
import { projects } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewMilestonePage({
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href={`/client/projects/${project.id}`}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-brand-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {project.title}
      </Link>
      <PageHeader
        eyebrow="New milestone"
        title="Define the work"
        description="The brief drives everything: the AI acceptance checklist, the funding amount, and what the freelancer is graded on."
      />
      <div className="card-surface rounded-2xl p-6 sm:p-7">
        <NewMilestoneForm projectId={project.id} />
      </div>
    </div>
  );
}
