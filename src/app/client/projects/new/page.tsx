import { redirect } from "next/navigation";
import { NewProjectForm } from "@/components/project-forms";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">New project</h1>
      <p className="mt-1 text-sm text-neutral-500">
        A project groups milestones for one engagement. Next you&apos;ll add a milestone and get an AI
        acceptance checklist.
      </p>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <NewProjectForm />
      </div>
    </div>
  );
}
