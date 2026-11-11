import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NewProjectForm } from "@/components/project-forms";
import PageHeader from "@/components/page-header";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Client workspace"
        title="New project"
        description="A project groups milestones for one engagement. Next you'll add a milestone and get an AI acceptance checklist."
      />
      <div className="card-surface rounded-2xl p-6 sm:p-7">
        <NewProjectForm />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-neutral-400">
        <ArrowLeft className="h-3 w-3" /> You can rename projects later from the project page.
      </p>
    </div>
  );
}
