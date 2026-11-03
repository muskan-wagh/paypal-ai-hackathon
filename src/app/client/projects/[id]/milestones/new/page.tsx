import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { NewMilestoneForm } from "@/components/project-forms";
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
    <div className="mx-auto max-w-xl">
      <Link href={`/client/projects/${project.id}`} className="text-sm text-neutral-500 hover:text-brand-navy">
        ← {project.title}
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">New milestone</h1>
      <p className="mt-1 text-sm text-neutral-500">
        The brief drives everything: the AI acceptance checklist, the funding amount, and what the
        freelancer is graded on.
      </p>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <NewMilestoneForm projectId={project.id} />
      </div>
    </div>
  );
}
