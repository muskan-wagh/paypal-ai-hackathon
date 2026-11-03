"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Accept / decline a pending invitation from the freelancer dashboard. */
export default function InvitationActions({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(kind: "accept" | "decline") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${token}/${kind}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? `Could not ${kind} the invitation.`);
        return;
      }
      const body = (await res.json()) as { milestoneId?: number };
      router.refresh();
      if (kind === "accept" && body.milestoneId) {
        router.push(`/milestones/${body.milestoneId}`);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <Button
          onClick={() => submit("accept")}
          disabled={busy}
          className="rounded-lg font-semibold"
          size="sm"
        >
          {busy ? "…" : "Accept"}
        </Button>
        <Button
          onClick={() => submit("decline")}
          disabled={busy}
          variant="outline"
          className="rounded-lg"
          size="sm"
        >
          Decline
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
