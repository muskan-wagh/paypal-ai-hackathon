"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { createInvitation } from "@/server/invitations";
import { createMilestone, createProject } from "@/server/projects";

export type FormState = { error?: string };

/** Amount field accepts "499", "499.50", "$499" — stored as integer cents. */
function parseAmountCents(value: string): number | null {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export async function createProjectAction(_prev: FormState, formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const result = createProject({
    user,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!result.ok) return { error: result.message };
  redirect(`/client/projects/${result.data.projectId}`);
}

export async function createMilestoneAction(_prev: FormState, formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amountCents = parseAmountCents(amountRaw);
  if (amountCents === null) return { error: "Enter an amount like 250 or 250.00." };

  const result = createMilestone({
    user,
    projectId: Number(formData.get("projectId")),
    title: String(formData.get("title") ?? ""),
    brief: String(formData.get("brief") ?? ""),
    amountCents,
    deadline: String(formData.get("deadline") ?? "") || null,
  });
  if (!result.ok) return { error: result.message };
  redirect(`/milestones/${result.data.milestoneId}`);
}

export async function inviteAction(_prev: FormState, formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const result = createInvitation({
    user,
    milestoneId: Number(formData.get("milestoneId")),
    inviteeEmail: String(formData.get("inviteeEmail") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!result.ok) return { error: result.message };
  redirect(`/milestones/${formData.get("milestoneId")}?invited=${result.data.token}`);
}
