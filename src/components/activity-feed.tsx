import Link from "next/link";
import { eventLabel } from "@/components/timeline";
import { formatTimestamp } from "@/lib/format";

export type ActivityEvent = {
  id: number;
  type: string;
  actor: string;
  createdAt: number;
  milestoneId: number;
  milestoneTitle: string;
};

/** Shared recent-activity feed used by both role dashboards. */
export default function ActivityFeed({
  events,
  className,
}: {
  events: ActivityEvent[];
  className?: string;
}) {
  return (
    <ol className={`space-y-4 ${className ?? ""}`}>
      {events.length === 0 && <li className="text-sm text-neutral-500">No activity yet.</li>}
      {events.map((event) => {
        const meta = eventLabel(event.type);
        const Icon = meta.icon;
        return (
          <li key={event.id} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                meta.tone === "emerald"
                  ? "bg-emerald-50 text-emerald-600"
                  : meta.tone === "violet"
                    ? "bg-violet-50 text-violet-600"
                    : meta.tone === "amber"
                      ? "bg-amber-50 text-amber-600"
                      : meta.tone === "red"
                        ? "bg-red-50 text-red-600"
                        : meta.tone === "brand"
                          ? "bg-accent text-brand"
                          : "bg-neutral-100 text-neutral-500"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <Link
                href={`/milestones/${event.milestoneId}`}
                className="text-sm font-medium text-neutral-800 transition-colors hover:text-brand"
              >
                {meta.label}
                <span className="ml-1 font-normal text-neutral-400">— {event.milestoneTitle}</span>
              </Link>
              <p className="text-xs text-neutral-400">
                {event.actor} · {formatTimestamp(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
