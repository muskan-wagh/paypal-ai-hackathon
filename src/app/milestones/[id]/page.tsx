import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import type { NavItem } from "@/components/dashboard-shell";
import DashboardShell from "@/components/dashboard-shell";
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
import Timeline from "@/components/timeline";
import ChecklistGenerator from "@/components/checklist-generator";
import FundButton from "@/components/fund-button";
import InvitePanel from "@/components/invite-panel";
import ProofSubmitForm from "@/components/proof-submit-form";
import ApprovalPanel from "@/components/approval-panel";
import PayoutButton from "@/components/payout-button";
import { getSessionUser } from "@/lib/session";
import { formatMoney, formatTimestamp } from "@/lib/format";
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
    .select({ submissionId: files.submissionId, fileId: files.id, filename: files.filename })
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

  return (
    <DashboardShell user={user} items={nav}>
      <div className="space-y-6">
        <Link
          href={user.role === "client" ? "/client/dashboard" : "/freelancer/dashboard"}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{milestone.title}</h1>
            <p className="mt-1 text-xs text-neutral-500">
              {row.projectTitle ? `${row.projectTitle} · ` : ""}
              {row.clientName} (client) → {row.freelancerName ?? "not yet accepted"} (freelancer)
            </p>
          </div>
          <StatusChip status={status} />
        </div>

        {/* progress chain */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
          {FLOW_CHAIN.map((chainStep, i) => (
            <span key={chainStep} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-neutral-300">→</span>}
              <span
                className={
                  statusIndexReached(status, chainStep)
                    ? "rounded-full bg-brand-navy px-2.5 py-1 text-white"
                    : "rounded-full bg-neutral-200 px-2.5 py-1 text-neutral-500"
                }
              >
                {chainStep}
              </span>
            </span>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-neutral-900">Brief</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-700">{milestone.brief}</p>
              <p className="mt-3 text-sm font-semibold text-neutral-900">
                {amountLabel}
                {milestone.deadline ? ` · due ${milestone.deadline}` : ""}
              </p>
              <p className="mt-3 text-xs">
                <span
                  className={
                    step.tone === "action"
                      ? "rounded-full bg-brand-navy px-2.5 py-1 font-semibold text-white"
                      : step.tone === "done"
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700"
                        : "rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600"
                  }
                >
                  {step.label}
                </span>
              </p>

              {/* Owner: generate the AI checklist while in DRAFT */}
              {isOwner && status === "DRAFT" ? (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <ChecklistGenerator milestoneId={milestoneId} />
                </div>
              ) : null}

              {/* Owner: invite a freelancer (CHECKLISTED/INVITED) */}
              {isOwner && (status === "CHECKLISTED" || status === "INVITED") ? (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <Mail className="h-4 w-4 text-brand" /> Invite a freelancer
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
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
                    <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
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
              {isOwner && status === "ACCEPTED" ? (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="text-sm">
                    {row.freelancerName} accepted. Fund with PayPal{" "}
                    <span className="font-semibold">{amountLabel}</span> — held in PayPal escrow until
                    you approve the proof.
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
                <div className="mt-4 border-t border-neutral-100 pt-4">
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
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="text-sm font-medium">
                    {status === "REJECTED" ? "Resubmit proof (address the feedback above)" : "Submit proof of delivery"}
                  </p>
                  <div className="mt-2">
                    <ProofSubmitForm milestoneId={milestoneId} />
                  </div>
                </div>
              ) : null}

              {/* Members: retry a failed AI evaluation */}
              {(isOwner || isAssignedFreelancer) && status === "SUBMITTED" ? (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="text-sm text-neutral-600">Evaluation failed or still running. Retry the AI evaluation:</p>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/milestones/${milestoneId}/evaluate`, { method: "POST" });
                      window.location.reload();
                    }}
                    className="mt-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-brand hover:text-brand-navy"
                  >
                    Retry AI evaluation
                  </button>
                </div>
              ) : null}
            </section>

            {status === "REJECTED" && rejectionNotes ? (
              <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h2 className="font-semibold text-red-800">Changes requested</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">{rejectionNotes}</p>
              </section>
            ) : null}

            {checklist.length > 0 ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-neutral-900">
                  Acceptance checklist
                  <span className="ml-2 text-xs font-normal text-neutral-400">AI-generated</span>
                </h2>
                <ul className="mt-2 space-y-3">
                  {checklist.map((item) => (
                    <li key={item.id} className="text-sm">
                      <p className="font-medium text-neutral-900">
                        {item.title}
                        <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
                          {item.checkType}
                        </span>
                      </p>
                      <p className="text-neutral-600">{item.acceptanceCriteria}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {milestoneSubmissions.length > 0 ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-neutral-900">Proof submissions</h2>
                {milestoneSubmissions.map((submission) => (
                  <div key={submission.id} className="mt-3 border-t border-neutral-100 pt-3 text-sm first:border-0 first:pt-0">
                    <p className="text-xs text-neutral-400">
                      {new Date(submission.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                    </p>
                    {submission.note ? <p className="mt-1 text-neutral-700">{submission.note}</p> : null}
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {submissionFileRows
                        .filter((f) => f.submissionId === submission.id)
                        .map((f) => (
                          <li key={f.fileId} className="rounded bg-neutral-100 px-2 py-1 text-xs">
                            📎 {f.filename}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </section>
            ) : null}

            {evaluationRows.length > 0 ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-neutral-900">
                  AI evaluation
                  <span className="ml-2 text-xs font-normal text-neutral-400">{evaluationRows[0].model}</span>
                </h2>
                {evaluationRows.map((evaluation) => (
                  <div key={evaluation.id} className="mt-3 border-t border-neutral-100 pt-3 first:border-0 first:pt-0">
                    <p className="text-sm">
                      <span className="font-semibold">{evaluation.verdict.toUpperCase()}</span>
                      {" · score "}
                      {evaluation.score}/100
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">{evaluation.summary}</p>
                    <ul className="mt-2 space-y-1.5">
                      {(evaluationItemsByEvaluation.get(evaluation.id) ?? []).map((entry) => (
                        <li key={entry.item.id} className="text-xs">
                          <span
                            className={
                              entry.item.verdict === "pass"
                                ? "font-semibold text-emerald-700"
                                : entry.item.verdict === "fail"
                                  ? "font-semibold text-red-700"
                                  : "font-semibold text-amber-700"
                            }
                          >
                            {entry.item.verdict.toUpperCase()}
                          </span>
                          {" — "}
                          {entry.checklistTitle}: {entry.item.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ) : null}

            {isOwner && status === "EVALUATED" ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-neutral-900">Final decision (human approval required)</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  AI never moves money. Review the verdict above, then approve or request changes.
                </p>
                <div className="mt-3">
                  <ApprovalPanel milestoneId={milestoneId} />
                </div>
              </section>
            ) : null}

            {isOwner && status === "APPROVED" ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-neutral-900">Send payout</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Approved — release {amountLabel} to the freelancer via PayPal Payouts.
                </p>
                <div className="mt-3">
                  <PayoutButton milestoneId={milestoneId} amountLabel={amountLabel} />
                </div>
              </section>
            ) : null}

            {payoutRows.length > 0 ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-neutral-900">Payouts</h2>
                {payoutRows.map((payout) => (
                  <p key={payout.id} className="mt-2 text-sm text-neutral-700 first:mt-0">
                    {payout.batchId} → {payout.receiver} · {formatMoney(payout.amountCents, milestone.currency)} ·{" "}
                    <span className="font-semibold">{payout.status}</span>
                  </p>
                ))}
              </section>
            ) : null}
          </div>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm h-fit lg:col-span-2">
            <h2 className="font-semibold text-neutral-900">Timeline</h2>
            <div className="mt-3">
              <Timeline events={eventRows} />
            </div>
          </section>
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
