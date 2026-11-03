"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { inviteAction, type FormState } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Invite a registered freelancer (by email) to this milestone.
 * Invitations always carry the checklist so the freelancer sees the grading bars.
 */
export default function InvitePanel({
  milestoneId,
  inviteUrl,
}: {
  milestoneId: number;
  inviteUrl: string | null;
}) {
  const [state, action] = useActionState(inviteAction, {} as FormState);
  const [copied, setCopied] = useState(false);

  function Submit() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" size="sm" disabled={pending} className="rounded-lg font-semibold">
        {pending ? "Sending invite…" : "Send invitation"}
      </Button>
    );
  }

  async function copy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      {inviteUrl ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">Invitation sent ✓</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="max-w-full overflow-x-auto rounded bg-white px-2 py-1 text-[11px] text-neutral-600">
              {inviteUrl}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:border-brand hover:text-brand-navy"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-emerald-700">
            The freelancer&apos;s ProofPay inbox also holds this invite — the link is a backup.
          </p>
        </div>
      ) : null}
      <form action={action} className="space-y-2.5">
        <input type="hidden" name="milestoneId" value={milestoneId} />
        <div>
          <Label htmlFor="inviteeEmail" className="text-xs font-medium text-neutral-600">
            Freelancer&apos;s ProofPay email
          </Label>
          <Input
            id="inviteeEmail"
            name="inviteeEmail"
            type="email"
            required
            placeholder="freelancer@proofpay.dev"
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label htmlFor="invite-message" className="text-xs font-medium text-neutral-600">
            Message (optional)
          </Label>
          <Input
            id="invite-message"
            name="message"
            placeholder="Short note — e.g. the hero redesign is urgent"
            className="mt-1 h-9"
          />
        </div>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <Submit />
      </form>
    </div>
  );
}
