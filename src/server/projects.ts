/**
 * Project + milestone creation logic shared by server actions and API routes.
 * All ownership checks run here — the browser never decides who owns what.
 */
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { writeEvent } from "@/db/log";
import { milestones, projects, type User } from "@/db/schema";

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export function createProject(input: {
  user: User;
  title: string;
  description?: string;
}): ServiceResult<{ projectId: number }> {
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  if (title.length < 3) {
    return { ok: false, code: "BAD_TITLE", message: "Project title must be at least 3 characters." };
  }
  if (input.user.role !== "client") {
    return { ok: false, code: "FORBIDDEN", message: "Only clients can create projects." };
  }
  const now = Date.now();
  const result = getDatabase()
    .insert(projects)
    .values({ clientId: input.user.id, title, description, createdAt: now, updatedAt: now })
    .run();
  return { ok: true, data: { projectId: Number(result.lastInsertRowid) } };
}

export function listProjectsFor(user: User) {
  const db = getDatabase();
  const projectRows =
    user.role === "client"
      ? db.select().from(projects).where(eq(projects.clientId, user.id)).orderBy(desc(projects.updatedAt)).all()
      : [];
  const milestoneRows = db
    .select()
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .orderBy(desc(milestones.createdAt))
    .all();
  return { projects: projectRows, milestones: milestoneRows };
}

export function getProjectFor(user: User, projectId: number) {
  const db = getDatabase();
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return { ok: false as const, code: "NOT_FOUND", message: "Project not found" };
  // Freelancers never see unassigned projects project listings.
  if (user.role !== "client" || project.clientId !== user.id) {
    return { ok: false as const, code: "FORBIDDEN", message: "You don't have access to this project" };
  }
  const rows = db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(desc(milestones.updatedAt)).all();
  return { ok: true as const, project, milestones: rows };
}

const MAX_AMOUNT = 100_000 * 100; // sandbox sanity ceiling

export function createMilestone(input: {
  user: User;
  projectId: number;
  title: string;
  brief: string;
  amountCents: number;
  currency?: string;
  deadline?: string | null;
}): ServiceResult<{ milestoneId: number }> {
  const db = getDatabase();
  const project = db.select().from(projects).where(eq(projects.id, input.projectId)).get();
  if (!project) return { ok: false, code: "NOT_FOUND", message: "Project not found." };
  if (project.clientId !== input.user.id || input.user.role !== "client") {
    return { ok: false, code: "FORBIDDEN", message: "You don't own this project." };
  }
  const title = input.title?.trim() ?? "";
  const brief = input.brief?.trim() ?? "";
  if (title.length < 3) {
    return { ok: false, code: "BAD_TITLE", message: "Milestone title must be at least 3 characters." };
  }
  if (brief.length < 20) {
    return {
      ok: false,
      code: "BAD_BRIEF",
      message: "Describe the work in at least 20 characters — the AI checklist needs context.",
    };
  }
  const amountCents = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return { ok: false, code: "BAD_AMOUNT", message: "Enter a milestone amount of at least $1.00." };
  }
  if (amountCents > MAX_AMOUNT) {
    return { ok: false, code: "BAD_AMOUNT", message: "Sandbox ceiling is $100,000 per milestone." };
  }
  const currency = input.currency === "EUR" ? "EUR" : "USD";
  let deadline: string | null = null;
  if (input.deadline) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) {
      return { ok: false, code: "BAD_DATE", message: "Deadline must be a date (YYYY-MM-DD)." };
    }
    deadline = input.deadline;
  }
  const now = Date.now();
  const result = db
    .insert(milestones)
    .values({
      clientId: input.user.id,
      projectId: project.id,
      title,
      brief,
      amountCents,
      currency,
      deadline,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const milestoneId = Number(result.lastInsertRowid);
  writeEvent(db, {
    milestoneId,
    type: "DRAFT_CREATED",
    actor: input.user.name,
    payload: { amountCents, projectId: project.id },
  });
  return { ok: true, data: { milestoneId } };
}
