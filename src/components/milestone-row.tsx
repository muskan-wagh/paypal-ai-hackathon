import Link from "next/link";
import StatusChip from "@/components/status-chip";
import type { Milestone } from "@/db/schema";
import { formatDate, formatMoney, formatTimestamp } from "@/lib/format";
import { nextStepFor } from "@/lib/next-step";
import type { MilestoneStatus } from "@/lib/state-machine";

const TONE_STYLES = {
  action: "bg-brand-navy text-white",
  ai: "bg-violet-100 text-violet-700",
  waiting: "bg-neutral-100 text-neutral-600",
  done: "bg-emerald-100 text-emerald-700",
} as const;

/** One milestone in a dashboard list — links to the shared detail workbench. */
export default function MilestoneRow({
  milestone,
  role,
  projectTitle,
}: {
  milestone: Milestone;
  role: "client" | "freelancer";
  projectTitle?: string | null;
}) {
  const step = nextStepFor(milestone.status as MilestoneStatus, role);
  return (
    <Link
      href={`/milestones/${milestone.id}`}
      className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-brand/50 hover:shadow"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-neutral-900">{milestone.title}</p>
            <StatusChip status={milestone.status as MilestoneStatus} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {formatMoney(milestone.amountCents, milestone.currency)}
            {" · deadline "}
            {formatDate(milestone.deadline)}
            {projectTitle ? ` · ${projectTitle}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_STYLES[step.tone]}`}
        >
          {step.label}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">Updated {formatTimestamp(milestone.updatedAt)}</p>
    </Link>
  );
}
