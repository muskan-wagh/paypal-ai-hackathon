import {
  Banknote,
  CheckCircle2,
  FilePlus2,
  ListChecks,
  MailPlus,
  MailX,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Upload,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { EventRow } from "@/db/schema";

export type EventTone = "neutral" | "brand" | "emerald" | "amber" | "violet" | "red";

const EVENT_META: Record<string, { label: string; icon: LucideIcon; tone: EventTone }> = {
  DRAFT_CREATED: { label: "Milestone created", icon: FilePlus2, tone: "neutral" },
  ORDER_CREATED: { label: "PayPal order created", icon: ShoppingBag, tone: "brand" },
  CHECKLIST_CREATED: { label: "AI acceptance checklist generated", icon: ListChecks, tone: "violet" },
  INVITED: { label: "Freelancer invited", icon: MailPlus, tone: "brand" },
  ACCEPTED: { label: "Freelancer accepted", icon: UserCheck, tone: "brand" },
  FUNDED: { label: "Funded via PayPal (escrow)", icon: Wallet, tone: "emerald" },
  SUBMITTED: { label: "Proof submitted", icon: Upload, tone: "amber" },
  EVALUATED: { label: "AI evaluation complete", icon: Sparkles, tone: "violet" },
  APPROVED: { label: "Client approved", icon: CheckCircle2, tone: "emerald" },
  REJECTED: { label: "Changes requested", icon: RotateCcw, tone: "red" },
  DECLINED: { label: "Invitation declined", icon: MailX, tone: "red" },
  PAID: { label: "Payout sent via PayPal", icon: Banknote, tone: "emerald" },
};

const TONE_STYLES: Record<EventTone, string> = {
  neutral: "bg-neutral-100 text-neutral-500",
  brand: "bg-accent text-brand",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-600",
};

export function eventLabel(type: string): { label: string; icon: LucideIcon; tone: EventTone } {
  return EVENT_META[type] ?? { label: type, icon: Sparkles, tone: "neutral" as EventTone };
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

/** Vertical audit timeline with Lucide icons and tone-coded markers. */
export default function Timeline({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No activity yet.</p>;
  }
  return (
    <ol className="relative space-y-4">
      {events.length > 1 && (
        <span
          aria-hidden
          className="absolute bottom-2 left-[13px] top-2 w-px bg-gradient-to-b from-neutral-200 via-neutral-200 to-transparent"
        />
      )}
      {events.map((event) => {
        const meta = eventLabel(event.type);
        const Icon = meta.icon;
        return (
          <li key={event.id} className="relative flex items-start gap-3 text-sm">
            <span
              aria-hidden
              className={`z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${TONE_STYLES[meta.tone]}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-medium text-neutral-900">
                {meta.label}
                {event.actor !== "system" ? (
                  <span className="ml-1.5 font-normal text-neutral-400">· {event.actor}</span>
                ) : null}
              </p>
              <p className="text-xs text-neutral-400">
                {relativeTime(event.createdAt)} ·{" "}
                {new Date(event.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
