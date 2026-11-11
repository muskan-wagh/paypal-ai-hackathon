import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Mail,
  Paperclip,
  UserRound,
} from "lucide-react";
import type { NavItem } from "@/components/dashboard-shell";
import DashboardShell from "@/components/dashboard-shell";
import { Reveal } from "@/components/motion";
import { getDatabase } from "@/db";
import {
  checklistItems,
  evaluations,
  evaluationItems,
  milestones,
  projects,
  payouts,
  submissions,
  users as usersTable,
  events,
  files,
  invitations,
} from "@/db/schema";
import StatusChip from "@/components/status-chip";
import DemoBadge from "@/components/demo-badge";
import Timeline from "@/components/timeline";
import ChecklistGenerator from "@/components/checklist-generator";
import FundButton from "@/components/fund-button";
import InvitePanel from "@/components/invite-panel";
import ProofSubmitForm from "@/components/proof-submit-form";
import ApprovalPanel from "@/components/approval-panel";
import PayoutButton from "@/components/payout-button";
import { getSessionUser } from "@/lib/session";
import { isDemoMilestone, isDemoPayout, progressPercent } from "@/lib/demo";
import { formatMoney, formatTimestamp, formatDate } from "@/lib/format";
import { nextStepFor } from "@/lib/next-step";
import { type MilestoneStatus } from "@/lib/state-machine";

export const dynamic = "force-dynamic";

const FLOW_CHAIN: MilestoneStatus[] = [
  "DRAFT",
  "CHECKLISTED",
  "INVITED",
  "ACCEPTED",
  "FUNDED",
  "SUBMITTED",
  "EVALUATED",
  "APPROVED",
  "PAID",
];

function ordinalStep(status: MilestoneStatus): number {
  const index = FLOW_CHAIN.indexOf(status);
  if (index >= 0) return index + 1;
  return 6; // REJECTED sits on the SUBMITTED line
}

function SectionCard({
  title,
  aside,
  children,
  className,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-surface rounded-2xl p-5 sm:p-6 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">{title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const VERDICT_TONE: Record<string, string> = {
  pass: "text-emerald-700",
  fail: "text-red-700",
  partial: "text-amber-700",
};

export default async function MilestoneDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invited?: string }>;
}) {
  const [{ id }, { invited }] = await Promise.all([params, searchParams]);
  const milestoneId = Number(id);
  if (!Number.isInteger(milestoneId)) notFound();

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDatabase();
  const client = alias(usersTable, "client_table");
  const freelancer = alias(usersTable, "freelancer_table");

  const row = await db
    .select({
      milestone: milestones,
      clientName: client.name,
      freelancerName: freelancer.name,
      freelancerEmail: freelancer.sandboxEmail,
      projectTitle: projects.title,
      projectId: projects.id,
    })
    .from(milestones)
    .innerJoin(client, eq(milestones.clientId, client.id))
    .leftJoin(freelancer, eq(milestones.freelancerId, freelancer.id))
    .leftJoin(projects, eq(milestones.projectId, projects.id))
    .where(eq(milestones.id, milestoneId))
    .get();
  if (!row) notFound();

  const { milestone } = row;
  const status = milestone.status as MilestoneStatus;
  const isOwner = user.role === "client" && user.id === milestone.clientId;
  const isAssignedFreelancer = user.role === "freelancer" && milestone.freelancerId === user.id;

  // Access control: the owner client, the assigned freelancer, or a freelancer
  // with a pending invitation targeted at their email. Nobody else.
  let myPendingInvite: { token: string } | null = null;
  if (user.role === "client" && !isOwner) notFound();
  if (user.role === "freelancer" && !isAssignedFreelancer) {
    myPendingInvite = db
      .select({ token: invitations.token })
      .from(invitations)
      .where(
        and(
          eq(invitations.milestoneId, milestoneId),
          eq(invitations.inviteeEmail, user.email!),
          eq(invitations.status, "pending"),
        ),
      )
      .get() ?? null;
    if (!myPendingInvite) notFound();
  }

  const checklist = db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.milestoneId, milestoneId))
    .orderBy(asc(checklistItems.sortOrder))
    .all();

  const milestoneSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.milestoneId, milestoneId))
    .orderBy(desc(submissions.createdAt));

  const submissionFileRows = await db
    .select({
      submissionId: files.submissionId,
      fileId: files.id,
      filename: files.filename,
      mimeType: files.mimeType,
    })
    .from(files);

  const evaluationRows = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.milestoneId, milestoneId))
    .orderBy(desc(evaluations.createdAt));

  const evaluationItemRows = await db
    .select({
      item: evaluationItems,
      checklistTitle: checklistItems.title,
    })
    .from(evaluationItems)
    .innerJoin(checklistItems, eq(evaluationItems.checklistItemId, checklistItems.id));
  const evaluationItemsByEvaluation = new Map<number, typeof evaluationItemRows>();
  for (const entry of evaluationItemRows) {
    const list = evaluationItemsByEvaluation.get(entry.item.evaluationId) ?? [];
    list.push(entry);
    evaluationItemsByEvaluation.set(entry.item.evaluationId, list);
  }

  const payoutRows = await db
    .select()
    .from(payouts)
    .where(eq(payouts.milestoneId, milestoneId))
    .orderBy(desc(payouts.createdAt));

  const eventRows = db
    .select()
    .from(events)
    .where(eq(events.milestoneId, milestoneId))
    .orderBy(desc(events.createdAt))
    .all();

  const invitationRows =
    isOwner && (status === "CHECKLISTED" || status === "INVITED")
      ? db
          .select({
            id: invitations.id,
            token: invitations.token,
            inviteeEmail: invitations.inviteeEmail,
            status: invitations.status,
            createdAt: invitations.createdAt,
            expiresAt: invitations.expiresAt,
          })
          .from(invitations)
          .where(eq(invitations.milestoneId, milestoneId))
          .orderBy(desc(invitations.createdAt))
          .all()
      : [];

  // Latest rejection notes (if any) for the freelancer's resubmission guidance.
  const rejectionEvent = eventRows.find((e) => e.type === "REJECTED");
  const rejectionNotes =
    rejectionEvent && rejectionEvent.payloadJson
      ? (() => {
          try {
            return (JSON.parse(rejectionEvent.payloadJson) as { notes?: string }).notes ?? null;
          } catch {
            return null;
          }
        })()
      : null;

  const step = nextStepFor(status, user.role === "client" ? "client" : "freelancer");
  const amountLabel = formatMoney(milestone.amountCents, milestone.currency);
  const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? "";
  const invitedToken = invited && /^[A-Za-z0-9_-]{20,}$/.test(invited) ? invited : null;

  const nav: NavItem[] = [
    user.role === "client"
      ? { href: "/client/dashboard", label: "Dashboard", icon: "dashboard", exact: true }
      : { href: "/freelancer/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    user.role === "client"
      ? { href: "/client/projects", label: "Projects", icon: "projects" }
      : { href: "/freelancer/invitations", label: "Invitations", icon: "inbox" },
    user.role === "client"
      ? { href: "/client/payments", label: "Payments", icon: "wallet" }
      : { href: "/freelancer/earnings", label: "Earnings", icon: "banknote" },
  ];

  const progress = progressPercent(status);

  return (
    <DashboardShell user={user} items={nav}>
      <div className="space-y-6">
        <Link
          href={user.role === "client" ? "/client/dashboard" : "/freelancer/dashboard"}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-brand-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {row.projectTitle ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
                {row.projectTitle}
              </p>
            ) : null}
            <h1 className="mt-0.5 text-[1.55rem] font-bold leading-tight tracking-[-0.02em] text-neutral-900">
              {milestone.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                {row.clientName} (client) → {row.freelancerName ?? "not yet accepted"} (freelancer)
              </span>
              {milestone.deadline ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> due {formatDate(milestone.deadline)}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <p className="text-2xl font-bold tracking-tight text-neutral-900 tnum">{amountLabel}</p>
            <div className="flex items-center gap-2">
              <StatusChip status={status} />
              {isDemoMilestone(milestone) ? <DemoBadge label="Demo data" /> : null}
            </div>
          </div>
        </div>

        {/* Progress stepper */}
        <Reveal>
          <div className="card-surface rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto">
              {FLOW_CHAIN.map((chainStep, i) => {
                const reached = statusIndexReached(status, chainStep);
                const isCurrent =
                  ordinalStep(chainStep) === ordinalStep(status) &&
                  (status !== "REJECTED" || chainStep === "SUBMITTED");
                return (
                  <div key={chainStep} className="flex min-w-0 flex-1 items-center last:flex-none">
                    <div className="flex min-w-0 flex-col items-center gap-1.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                          reached
                            ? "bg-brand-navy text-white"
                            : "bg-neutral-200 text-neutral-500"
                        } ${isCurrent ? "ring-4 ring-brand/15" : ""}`}
                      >
                        {i + 1}
                      </span>
                      <span
                        title={chainStep}
                        className={`hidden truncate text-[9px] font-semibold uppercase tracking-wide sm:block ${
                          isCurrent ? "text-brand-navy" : reached ? "text-neutral-500" : "text-neutral-300"
                        }`}
                      >
                        {chainStep}
                      </span>
                    </div>
                    {i < FLOW_CHAIN.length - 1 && (
                      <span
                        aria-hidden
                        className={`mx-1 h-px flex-1 ${reached ? "bg-brand-navy/40" : "bg-neutral-200"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-neutral-100 pt-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand-sky"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  step.tone === "action"
                    ? "bg-brand-navy text-white"
                    : step.tone === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : step.tone === "ai"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-3">
            <SectionCard title="Brief">
              <p className="text-sm leading-relaxed text-neutral-700">{milestone.brief}</p>
              <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-neutral-900 tnum">
                <CircleDollarSign className="h-4 w-4 text-brand" />
                {amountLabel}
                {milestone.deadline ? <span className="font-normal text-neutral-500">· due {formatDate(milestone.deadline)}</span> : null}
              </p>

              {/* Owner: generate the AI checklist while in DRAFT */}
              {isOwner && status === "DRAFT" ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <ChecklistGenerator milestoneId={milestoneId} />
                </div>
              ) : null}

              {/* Owner: invite a freelancer (CHECKLISTED/INVITED) */}
              {isOwner && (status === "CHECKLISTED" || status === "INVITED") ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <Mail className="h-4 w-4 text-brand" /> Invite a freelancer
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    The invitee must be a registered ProofPay freelancer. Invites expire after 7
                    days; accepting binds them to this checklist.
                  </p>
                  <div className="mt-3">
                    <InvitePanel
                      milestoneId={milestoneId}
                      inviteUrl={
                        invitedToken ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${invitedToken}` : null
                      }
                    />
                  </div>
                  {invitationRows.length > 0 && (
                    <ul className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3">
                      {invitationRows.map((invite) => (
                        <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-600">
                            {invite.inviteeEmail} · sent {formatTimestamp(invite.createdAt)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              invite.status === "accepted"
                                ? "bg-emerald-100 text-emerald-700"
                                : invite.status === "declined"
                                  ? "bg-red-100 text-red-700"
                                  : invite.status === "expired" || invite.expiresAt < Date.now()
                                    ? "bg-neutral-100 text-neutral-500"
                                    : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {invite.expiresAt < Date.now() && invite.status === "pending"
                              ? "expired — invite someone else"
                              : invite.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {/* Owner: fund once the freelancer has accepted */}
              {isOwner && status === "ACCEPTED" && isDemoMilestone(milestone) ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-800">
                  This milestone is part of the seeded demo. Funding is simulated with a sample
                  PayPal order id (<code className="text-xs">DEMO-…</code>) — the funding step is
                  intentionally disabled so demo data can never trigger a real PayPal payment. Create a
                  live milestone to run the real flow.
                </div>
              ) : null}
              {isOwner && status === "ACCEPTED" && !isDemoMilestone(milestone) ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <p className="text-sm leading-relaxed">
                    {row.freelancerName} accepted. Fund with PayPal{" "}
                    <span className="font-semibold tnum">{amountLabel}</span> — held in PayPal escrow
                    until you approve the proof.
                  </p>
                  <div className="mt-3">
                    <FundButton
                      milestoneId={milestoneId}
                      paypalClientId={paypalClientId}
                      currency={milestone.currency}
                      amountLabel={amountLabel}
                    />
                  </div>
                </div>
              ) : null}

              {/* Freelancer: view their invitation */}
              {user.role === "freelancer" && myPendingInvite && status === "INVITED" ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <p className="text-sm text-neutral-600">
                    You&apos;ve been invited. Accept it from{" "}
                    <Link href="/freelancer/invitations" className="font-semibold text-brand hover:underline">
                      your invitations
                    </Link>{" "}
                    to bind yourself to this checklist.
                  </p>
                </div>
              ) : null}

              {/* Freelancer: submit / resubmit proof */}
              {isAssignedFreelancer && (status === "FUNDED" || status === "REJECTED") ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <p className="text-sm font-semibold text-neutral-900">
                    {status === "REJECTED" ? "Resubmit proof (address the feedback above)" : "Submit proof of delivery"}
                  </p>
                  <div className="mt-2.5">
                    <ProofSubmitForm milestoneId={milestoneId} />
                  </div>
                </div>
              ) : null}

              {/* Members: retry a failed AI evaluation */}
              {(isOwner || isAssignedFreelancer) && status === "SUBMITTED" ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <p className="text-sm text-neutral-600">
                    Evaluation failed or still running. Retry the AI evaluation:
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/milestones/${milestoneId}/evaluate`, { method: "POST" });
                      window.location.reload();
                    }}
                    className="mt-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 transition hover:border-brand hover:text-brand-navy"
                  >
                    Retry AI evaluation
                  </button>
                </div>
              ) : null}
            </SectionCard>

            {status === "REJECTED" && rejectionNotes ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-red-700">
                  Changes requested
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-red-800">
                  {rejectionNotes}
                </p>
              </section>
            ) : null}

            {checklist.length > 0 ? (
              <SectionCard
                title="Acceptance checklist"
                aside={
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
                    AI-generated
                  </span>
                }
              >
                <ul className="space-y-3.5">
                  {checklist.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand/60"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900">
                          {item.title}
                          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-neutral-500">
                            {item.checkType}
                          </span>
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">
                          {item.acceptanceCriteria}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            {milestoneSubmissions.length > 0 ? (
              <SectionCard title="Proof submissions">
                {milestoneSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="mt-4 border-t border-neutral-100 pt-4 first:mt-0 first:border-0 first:pt-0"
                  >
                    <p className="text-xs text-neutral-400">
                      {new Date(submission.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                    </p>
                    {submission.note ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{submission.note}</p>
                    ) : null}
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {submissionFileRows
                        .filter((f) => f.submissionId === submission.id)
                        .map((f) => (
                          <li
                            key={f.fileId}
                            className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                          >
                            <Paperclip className="h-3 w-3" />
                            {f.filename}
                          </li>
                        ))}
                    </ul>
                    {submissionFileRows.some(
                      (f) => f.submissionId === submission.id && f.mimeType.startsWith("image/"),
                    ) ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {submissionFileRows
                          .filter((f) => f.submissionId === submission.id && f.mimeType.startsWith("image/"))
                          .map((f) => (
                            <a
                              key={f.fileId}
                              href={`/api/files/${f.fileId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="group block overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 transition hover:border-brand/60 hover:shadow-card"
                              title={`Open ${f.filename}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/files/${f.fileId}`}
                                alt={`Submitted proof: ${f.filename}`}
                                className="aspect-video w-full bg-white object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                              />
                              <span className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-neutral-500 group-hover:text-brand-navy">
                                <span className="inline-flex items-center gap-1 truncate">
                                  <Paperclip className="h-3 w-3" />
                                  {f.filename}
                                </span>
                                <span className="font-semibold">Open ↗</span>
                              </span>
                            </a>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </SectionCard>
            ) : null}

            {evaluationRows.length > 0 ? (
              <SectionCard
                title="AI evaluation"
                aside={
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
                    {evaluationRows[0].model}
                  </span>
                }
              >
                {evaluationRows.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="mt-4 border-t border-neutral-100 pt-4 first:mt-0 first:border-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                          evaluation.verdict === "pass"
                            ? "bg-emerald-100 text-emerald-700"
                            : evaluation.verdict === "fail"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {evaluation.verdict.toUpperCase()}
                      </span>
                      <span className="text-sm text-neutral-500">
                        score{" "}
                        <span className="font-bold text-neutral-900 tnum">{evaluation.score}/100</span>
                      </span>
                      <div className="hidden h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-neutral-100 sm:block">
                        <div
                          className={`h-full rounded-full ${
                            evaluation.score >= 75
                              ? "bg-emerald-500"
                              : evaluation.score >= 50
                                ? "bg-amber-500"
                                : "bg-red-400"
                          }`}
                          style={{ width: `${evaluation.score}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-700">{evaluation.summary}</p>
                    <ul className="mt-3 space-y-2">
                      {(evaluationItemsByEvaluation.get(evaluation.id) ?? []).map((entry) => (
                        <li
                          key={entry.item.id}
                          className="rounded-lg bg-neutral-50/80 px-3 py-2 text-xs leading-relaxed"
                        >
                          <span className={`font-bold ${VERDICT_TONE[entry.item.verdict] ?? "text-neutral-600"}`}>
                            {entry.item.verdict.toUpperCase()}
                          </span>
                          {" — "}
                          <span className="font-medium text-neutral-800">{entry.checklistTitle}:</span>{" "}
                          {entry.item.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </SectionCard>
            ) : null}

            {isOwner && status === "EVALUATED" ? (
              <section className="rounded-2xl border border-brand/30 bg-accent/50 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-semibold tracking-tight text-brand-navy">
                  <UserRound className="h-4 w-4" /> Final decision (human approval required)
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  AI never moves money. Review the verdict above, then approve or request changes.
                </p>
                <div className="mt-4">
                  <ApprovalPanel milestoneId={milestoneId} />
                </div>
              </section>
            ) : null}

            {isOwner && status === "APPROVED" && isDemoMilestone(milestone) ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-semibold tracking-tight text-amber-900">
                  Payout (sample transaction) <DemoBadge label="Payouts disabled" />
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-amber-700">
                  In the live flow you would release {amountLabel} to the freelancer via PayPal
                  Payouts here. This record is seeded demo data — the payout was inserted as a
                  labelled sample (batch id <code>DEMO-…</code>) and the payout button is disabled
                  so no PayPal call can be triggered from it.
                </p>
              </section>
            ) : null}
            {isOwner && status === "APPROVED" && !isDemoMilestone(milestone) ? (
              <SectionCard title="Send payout">
                <p className="text-xs leading-relaxed text-neutral-500">
                  Approved — release {amountLabel} to the freelancer via PayPal Payouts.
                </p>
                <div className="mt-3">
                  <PayoutButton milestoneId={milestoneId} amountLabel={amountLabel} />
                </div>
              </SectionCard>
            ) : null}

            {payoutRows.length > 0 ? (
              <SectionCard title="Payouts">
                {payoutRows.map((payout) => (
                  <div key={payout.id} className="mt-3 text-sm first:mt-0">
                    <p className="leading-relaxed text-neutral-700">
                      <span className="font-mono text-xs text-neutral-500">{payout.batchId}</span>
                      {" → "}
                      {payout.receiver} ·{" "}
                      <span className="font-semibold tnum">
                        {formatMoney(payout.amountCents, milestone.currency)}
                      </span>{" "}
                      ·{" "}
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {payout.status}
                      </span>
                    </p>
                    {isDemoPayout(payout) ? (
                      <p className="mt-1.5 text-xs text-neutral-500">
                        <DemoBadge label="Sample transaction" />{" "}
                        Seeded demo payout — no PayPal API call was made for this record.
                      </p>
                    ) : null}
                  </div>
                ))}
              </SectionCard>
            ) : null}
          </div>

          {/* Right rail */}
          <div className="space-y-6 lg:col-span-2">
            <SectionCard title="Audit trail" className="h-fit">
              <Timeline events={eventRows} />
            </SectionCard>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

/** Forward-progress styling for the chain pills (REJECTED renders on SUBMITTED's line). */
function statusIndexReached(current: MilestoneStatus, step: MilestoneStatus): boolean {
  const currentOrdinal = ordinalStep(current);
  return ordinalStep(step) <= currentOrdinal;
}
