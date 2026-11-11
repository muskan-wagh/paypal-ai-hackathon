"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Send } from "lucide-react";
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
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="h-9 gap-2 rounded-lg px-4 text-sm font-semibold"
      >
        <Send className="h-3.5 w-3.5" />
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
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <Check className="h-3.5 w-3.5" /> Invitation sent
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="max-w-full overflow-x-auto rounded-lg bg-white px-2 py-1 text-[11px] text-neutral-600 ring-1 ring-emerald-100">
              {inviteUrl}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:border-brand hover:text-brand-navy"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-emerald-700">
            The freelancer&apos;s ProofPay inbox also holds this invite — the link is a backup.
          </p>
        </div>
      ) : null}
      <form action={action} className="space-y-3">
        <input type="hidden" name="milestoneId" value={milestoneId} />
        <div className="space-y-1.5">
          <Label htmlFor="inviteeEmail" className="text-xs font-medium text-neutral-600">
            Freelancer&apos;s ProofPay email
          </Label>
          <Input
            id="inviteeEmail"
            name="inviteeEmail"
            type="email"
            required
            placeholder="freelancer@proofpay.dev"
            className="mt-0 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-message" className="text-xs font-medium text-neutral-600">
            Message (optional)
          </Label>
          <Input
            id="invite-message"
            name="message"
            placeholder="Short note — e.g. the hero redesign is urgent"
            className="mt-0 h-9"
          />
        </div>
        {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
        <Submit />
      </form>
    </div>
  );
}
