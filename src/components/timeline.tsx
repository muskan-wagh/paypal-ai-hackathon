import type { EventRow } from "@/db/schema";

export const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  DRAFT_CREATED: { label: "Milestone created", icon: "○" },
  ORDER_CREATED: { label: "PayPal order created", icon: "↳" },
  CHECKLIST_CREATED: { label: "AI acceptance checklist generated", icon: "✓" },
  INVITED: { label: "Freelancer invited", icon: "✉" },
  ACCEPTED: { label: "Freelancer accepted", icon: "✓" },
  FUNDED: { label: "Funded via PayPal (escrow)", icon: "$" },
  SUBMITTED: { label: "Proof submitted", icon: "↥" },
  EVALUATED: { label: "AI evaluation complete", icon: "◈" },
  APPROVED: { label: "Client approved", icon: "✓" },
  REJECTED: { label: "Changes requested", icon: "↻" },
  DECLINED: { label: "Invitation declined", icon: "↻" },
  PAID: { label: "Payout sent via PayPal", icon: "$" },
};

export function eventLabel(type: string): { label: string; icon: string } {
  return EVENT_LABELS[type] ?? { label: type, icon: "•" };
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function Timeline({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No activity yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const meta = EVENT_LABELS[event.type] ?? { label: event.type, icon: "•" };
        return (
          <li key={event.id} className="flex items-start gap-3 text-sm">
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600"
            >
              {meta.icon}
            </span>
            <div>
              <p className="font-medium text-neutral-900">
                {meta.label}
                <span className="ml-2 font-normal text-neutral-500">
                  {event.actor !== "system" ? `by ${event.actor}` : ""}
                </span>
              </p>
              <p className="text-xs text-neutral-400">
                {relativeTime(event.createdAt)} · {new Date(event.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
