import { asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDatabase } from "@/db";
import {
  checklistItems,
  evaluations,
  evaluationItems,
  milestones,
  payouts,
  submissions,
  users as usersTable,
  events,
  files,
} from "@/db/schema";
import AppHeader from "@/components/app-header";
import StatusChip from "@/components/status-chip";
import Timeline from "@/components/timeline";
import ChecklistGenerator from "@/components/checklist-generator";
import FundButton from "@/components/fund-button";
import ProofSubmitForm from "@/components/proof-submit-form";
import ApprovalPanel from "@/components/approval-panel";
import PayoutButton from "@/components/payout-button";
import { getSessionUser } from "@/lib/session";
import {
  MILESTONE_STATUSES,
  type MilestoneStatus,
} from "@/lib/state-machine";

export const dynamic = "force-dynamic";

const NEXT_ACTION_HINTS: Partial<Record<MilestoneStatus, { client: string; freelancer: string }>> = {
  DRAFT: {
    client: "Next: generate the AI acceptance checklist (Phase 4 wiring).",
    freelancer: "Waiting for the client to generate the acceptance checklist.",
  },
  CHECKLISTED: {
    client: "Next: fund this milestone with PayPal (spike flow, Phase 5 wiring).",
    freelancer: "Waiting for escrow funding via PayPal.",
  },
  FUNDED: {
    client: "Funds are in escrow — waiting for proof from the freelancer.",
    freelancer: "Next: submit your proof (Phase 6 wiring).",
  },
  SUBMITTED: {
    client: "Proof received — AI evaluation runs next (Phase 6 wiring).",
    freelancer: "Proof submitted — AI evaluation pending.",
  },
  EVALUATED: {
    client: "Next: review the AI verdict and approve or request changes (Phase 7 wiring).",
    freelancer: "AI evaluated your proof — awaiting the client's decision.",
  },
  REJECTED: {
    client: "Changes requested — waiting for new proof.",
    freelancer: "Next: submit new proof addressing the feedback.",
  },
  APPROVED: {
    client: "Next: send the PayPal payout (Phase 7 wiring).",
    freelancer: "Approved — payout incoming.",
  },
  PAID: {
    client: "Paid. Done.",
    freelancer: "Paid to your PayPal account.",
  },
};

function ordinalStep(status: MilestoneStatus): number {
  const mainLine: MilestoneStatus[] = [
    "DRAFT",
    "CHECKLISTED",
    "FUNDED",
    "SUBMITTED",
    "EVALUATED",
    "APPROVED",
    "PAID",
  ];
  const index = mainLine.indexOf(status);
  if (index >= 0) return index + 1;
  return 5; // REJECTED sits on the SUBMITTED line
}

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    })
    .from(milestones)
    .innerJoin(client, eq(milestones.clientId, client.id))
    .leftJoin(freelancer, eq(milestones.freelancerId, freelancer.id))
    .where(eq(milestones.id, milestoneId))
    .get();
  if (!row) notFound();

  const { milestone } = row;
  const status = milestone.status as MilestoneStatus;

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
  const statusIndex = MILESTONE_STATUSES.indexOf(status);
  const hint = (NEXT_ACTION_HINTS[status]?.[user.role === "client" ? "client" : "freelancer"] ?? "") as string;
  const amountLabel = `$${(milestone.amountCents / 100).toFixed(2)} ${milestone.currency}`;
  const paypalClientId = process.env.PAYPAL_CLIENT_ID ?? "";

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/milestones" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← All milestones
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{milestone.title}</h1>
          <StatusChip status={status} />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {row.clientName} (client) → {row.freelancerName ?? "unassigned"} (freelancer)
        </p>

        {/* progress pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
          {(["DRAFT", "CHECKLISTED", "FUNDED", "SUBMITTED", "EVALUATED", "APPROVED", "PAID"] as MilestoneStatus[]).map(
            (step, i) => (
              <span key={step} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-neutral-300">→</span>}
                <span
                  className={
                    statusIndex >= ordinalStep(step) || status === step
                      ? "rounded bg-neutral-900 px-2 py-0.5 text-white"
                      : "rounded bg-neutral-200 px-2 py-0.5 text-neutral-500"
                  }
                >
                  {step}
                </span>
              </span>
            ),
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="font-semibold">Brief</h2>
              <p className="mt-1 text-sm text-neutral-700">{milestone.brief}</p>
              <p className="mt-3 text-sm font-semibold">
                ${(milestone.amountCents / 100).toFixed(2)} {milestone.currency}
                {milestone.deadline ? ` · due ${milestone.deadline}` : ""}
              </p>
              {hint ? <p className="mt-3 text-xs text-blue-700">{hint}</p> : null}
              {user.role === "client" && user.id === milestone.clientId && status === "DRAFT" ? (
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <ChecklistGenerator milestoneId={milestoneId} />
                </div>
              ) : null}
              {user.role === "client" && user.id === milestone.clientId && status === "CHECKLISTED" ? (
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <p className="text-sm">
                    Fund with PayPal <span className="font-semibold">{amountLabel}</span> — held in PayPal escrow
                    until you approve the proof.
                  </p>
                  <FundButton
                    milestoneId={milestoneId}
                    paypalClientId={paypalClientId}
                    currency={milestone.currency}
                    amountLabel={amountLabel}
                  />
                </div>
              ) : null}
              {user.role === "freelancer" && user.id === milestone.freelancerId && (status === "FUNDED" || status === "REJECTED") ? (
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <p className="text-sm font-medium">
                    {status === "REJECTED" ? "Resubmit proof (address the feedback above)" : "Submit proof of delivery"}
                  </p>
                  <div className="mt-2">
                    <ProofSubmitForm milestoneId={milestoneId} />
                  </div>
                </div>
              ) : null}
              {user.role === "freelancer" && user.id === milestone.freelancerId && status === "SUBMITTED" ? (
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <p className="text-sm text-neutral-600">Evaluation failed or still running. Retry the AI evaluation:</p>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/milestones/${milestoneId}/evaluate`, { method: "POST" });
                      window.location.reload();
                    }}
                    className="mt-2 rounded border border-neutral-300 bg-white px-3 py-1 text-xs"
                  >
                    Retry AI evaluation
                  </button>
                </div>
              ) : null}
            </section>

            {status === "REJECTED" && rejectionNotes ? (
              <section className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h2 className="font-semibold text-red-800">Changes requested</h2>
                <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{rejectionNotes}</p>
              </section>
            ) : null}
            {checklist.length > 0 ? (
              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="font-semibold">
                  Acceptance checklist
                  <span className="ml-2 text-xs font-normal text-neutral-400">AI-generated</span>
                </h2>
                <ul className="mt-2 space-y-3">
                  {checklist.map((item) => (
                    <li key={item.id} className="text-sm">
                      <p className="font-medium">
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
              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="font-semibold">Proof submissions</h2>
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
              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="font-semibold">
                  AI evaluation
                  <span className="ml-2 text-xs font-normal text-neutral-400">
                    {evaluationRows[0].model}
                  </span>
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

            {user.role === "client" && user.id === milestone.clientId && status === "EVALUATED" ? (
              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="font-semibold">Final decision (human approval required)</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  AI never moves money. Review the verdict above, then approve or request changes.
                </p>
                <div className="mt-3">
                  <ApprovalPanel milestoneId={milestoneId} />
                </div>
              </section>
            ) : null}

            {user.role === "client" && user.id === milestone.clientId && status === "APPROVED" ? (
              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="font-semibold">Send payout</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Approved — release {amountLabel} to the freelancer via PayPal Payouts.
                </p>
                <div className="mt-3">
                  <PayoutButton milestoneId={milestoneId} amountLabel={amountLabel} />
                </div>
              </section>
            ) : null}

            {payoutRows.length > 0 ? (
              <section className="rounded-lg border border-neutral-200 bg-white p-4">
                <h2 className="font-semibold">Payouts</h2>
                {payoutRows.map((payout) => (
                  <p key={payout.id} className="mt-2 text-sm text-neutral-700 first:mt-0">
                    {payout.batchId} → {payout.receiver} · ${(payout.amountCents / 100).toFixed(2)} ·{" "}
                    <span className="font-semibold">{payout.status}</span>
                  </p>
                ))}
              </section>
            ) : null}
          </div>

          <section className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-2">
            <h2 className="font-semibold">Timeline</h2>
            <div className="mt-3">
              <Timeline events={eventRows} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
