import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import InvitationActions from "@/components/invitation-actions";
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Invitations</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Offers sent to <span className="font-medium text-neutral-700">{user.email}</span>.
          Accepting binds you to the milestone&apos;s checklist, amount and deadline.
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-neutral-900">Waiting for you</h2>
          <div className="mt-3 space-y-2">
            {pending.map((invite) => (
              <div
                key={invite.token}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/milestones/${invite.milestoneId}`}
                    className="truncate font-semibold text-neutral-900 hover:text-brand"
                  >
                    {invite.milestoneTitle}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatMoney(invite.amountCents, invite.currency)}
                    {invite.message ? ` · “${invite.message}”` : ""} · expires{" "}
                    {formatTimestamp(invite.expiresAt)}
                  </p>
                </div>
                <InvitationActions token={invite.token} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-neutral-900">History</h2>
        {history.length === 0 && pending.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="font-medium text-neutral-700">No invitations yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
              When a client invites you to a milestone, it appears here and in your dashboard.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((invite) => (
              <li
                key={invite.token}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm"
              >
                <Link
                  href={`/milestones/${invite.milestoneId}`}
                  className="font-medium text-neutral-800 hover:text-brand"
                >
                  {invite.milestoneTitle}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500">
                    {formatMoney(invite.amountCents, invite.currency)}
                  </span>
                  <Badge variant="outline" className={INVITE_STATUS_STYLE[invite.status] ?? ""}>
                    {invite.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
