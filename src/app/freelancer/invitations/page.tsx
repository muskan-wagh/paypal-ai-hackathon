import Link from "next/link";
import { redirect } from "next/navigation";
import { MailOpen, MailPlus } from "lucide-react";
import InvitationActions from "@/components/invitation-actions";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { listInvitationsFor } from "@/server/invitations";
import { getSessionUser } from "@/lib/session";
import { formatMoney, formatTimestamp } from "@/lib/format";

export const dynamic = "force-dynamic";

const INVITE_STATUS_STYLE: Record<string, string> = {
  pending: "border-indigo-200 bg-indigo-50 text-indigo-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  declined: "border-red-200 bg-red-50 text-red-700",
  expired: "border-neutral-200 bg-neutral-100 text-neutral-500",
};

export default async function InvitationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "freelancer") redirect("/dashboard");

  const rows = listInvitationsFor(user);
  const pending = rows.filter((r) => r.status === "pending" && r.expiresAt > Date.now());
  const history = rows.filter((r) => !pending.includes(r));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Freelancer workspace"
        title="Invitations"
        description={
          <>
            Offers sent to <span className="font-medium text-neutral-700">{user.email}</span>.
            Accepting binds you to the milestone&apos;s checklist, amount and deadline.
          </>
        }
      />

      {pending.length > 0 ? (
        <Reveal>
          <section>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight text-neutral-900">
              <MailPlus className="h-4 w-4 text-brand" /> Waiting for you
            </h2>
            <div className="mt-3 space-y-2">
              {pending.map((invite) => (
                <div
                  key={invite.token}
                  className="card-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 border-l-brand p-4 sm:p-5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/milestones/${invite.milestoneId}`}
                      className="truncate font-semibold text-neutral-900 transition-colors hover:text-brand"
                    >
                      {invite.milestoneTitle}
                    </Link>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      <span className="font-semibold text-neutral-700 tnum">
                        {formatMoney(invite.amountCents, invite.currency)}
                      </span>
                      {invite.message ? ` · “${invite.message}”` : ""} · expires{" "}
                      {formatTimestamp(invite.expiresAt)}
                    </p>
                  </div>
                  <InvitationActions token={invite.token} />
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      <section>
        <h2 className="flex items-center gap-2 font-semibold tracking-tight text-neutral-900">
          <MailOpen className="h-4 w-4 text-neutral-400" /> History
        </h2>
        {history.length === 0 && pending.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={MailPlus}
              title="No invitations yet"
              body="When a client invites you to a milestone, it appears here and in your dashboard."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((invite) => (
              <Reveal key={invite.token}>
                <li className="card-surface flex flex-wrap items-center justify-between gap-2 rounded-xl p-4 text-sm">
                  <Link
                    href={`/milestones/${invite.milestoneId}`}
                    className="font-medium text-neutral-800 transition-colors hover:text-brand"
                  >
                    {invite.milestoneTitle}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 tnum">
                      {formatMoney(invite.amountCents, invite.currency)}
                    </span>
                    <Badge variant="outline" className={INVITE_STATUS_STYLE[invite.status] ?? ""}>
                      {invite.status}
                    </Badge>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
