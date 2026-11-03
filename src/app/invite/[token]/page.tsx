import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import Brand from "@/components/brand";
import InvitationActions from "@/components/invitation-actions";
import StatusChip from "@/components/status-chip";
import { formatMoney, formatDate } from "@/lib/format";
import type { MilestoneStatus } from "@/lib/state-machine";
import { getSessionUser } from "@/lib/session";
import { viewInvitation } from "@/server/invitations";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = viewInvitation(token);
  const user = await getSessionUser();

  if (!result.ok) {
    return (
      <InviteFrame>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">Invitation not found</p>
          <p className="mt-1 text-sm text-red-600">
            This link may have been mistyped, or the invitation was revoked.
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>{" "}
          and check your invitations list instead.
        </p>
      </InviteFrame>
    );
  }

  const invite = result.data;
  const inviteeMatch = user?.role === "freelancer" && user.email === invite.inviteeEmail;
  const canAct = user && inviteeMatch && invite.status === "pending";

  let notice: string | null = null;
  if (!user) {
    notice = "Log in or register with the invited email to accept this milestone.";
  } else if (user.role === "client") {
    notice = `This invitation was sent to ${invite.inviteeEmail} — clients can't accept invites.`;
  } else if (!inviteeMatch) {
    notice = `This invitation was sent to ${invite.inviteeEmail}. Register or log in with that email to accept.`;
  } else if (invite.status !== "pending") {
    notice = `This invitation is ${invite.status}.`;
  }

  return (
    <InviteFrame>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Milestone invitation · from {invite.inviterName}
          </p>
          <h1 className="mt-1 text-xl font-bold text-neutral-900">{invite.milestone.title}</h1>
          {invite.message && (
            <p className="mt-2 rounded-lg bg-brand-wash p-3 text-sm text-neutral-600">
              “{invite.message}”
            </p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Escrow funding</dt>
            <dd className="mt-0.5 font-bold text-neutral-900">
              {formatMoney(invite.milestone.amountCents, invite.milestone.currency)}
            </dd>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Deadline</dt>
            <dd className="mt-0.5 font-bold text-neutral-900">{formatDate(invite.milestone.deadline)}</dd>
          </div>
        </dl>

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Brief</p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">{invite.milestone.brief}</p>
          <p className="mt-2 text-xs text-neutral-400">
            The AI acceptance checklist is generated from this brief — you'll see every criterion
            before you accept.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-sm">
          <span className="text-neutral-600">Milestone status</span>
          <StatusChip status={invite.milestone.status as MilestoneStatus} />
        </div>

        {canAct ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Accept this milestone?</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Accepting binds you to the checklist above as the assigned freelancer.
            </p>
            <div className="mt-3">
              <InvitationActions token={invite.token} />
            </div>
          </div>
        ) : notice ? (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </p>
        ) : null}

        {!user && (
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Log in to accept
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-lg border border-neutral-300 bg-white py-2.5 text-center text-sm font-semibold text-neutral-700 transition hover:border-brand hover:text-brand-navy"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </InviteFrame>
  );
}

function InviteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-wash">
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <Brand />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-neutral-200 bg-white py-3 text-center text-[11px] text-neutral-400">
        Sandbox environment — all payments are PayPal play money.
      </footer>
    </div>
  );
}
