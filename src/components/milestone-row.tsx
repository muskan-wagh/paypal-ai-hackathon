import Link from "next/link";
import { CalendarDays } from "lucide-react";
import DemoBadge from "@/components/demo-badge";
import StatusChip from "@/components/status-chip";
import { AnimatedBar, Reveal } from "@/components/motion";
import type { Milestone } from "@/db/schema";
import { isDemoMilestone, progressPercent } from "@/lib/demo";
import { formatDate, formatMoney, formatTimestamp } from "@/lib/format";
import { nextStepFor } from "@/lib/next-step";
import type { MilestoneStatus } from "@/lib/state-machine";

const TONE_STYLES = {
  action: "bg-brand-navy text-white",
  ai: "bg-violet-100 text-violet-700",
  waiting: "bg-neutral-100 text-neutral-600",
  done: "bg-emerald-100 text-emerald-700",
} as const;

const PROGRESS_TONE: Record<MilestoneStatus, string> = {
  DRAFT: "bg-neutral-300",
  CHECKLISTED: "bg-sky-500",
  INVITED: "bg-indigo-500",
  ACCEPTED: "bg-blue-500",
  FUNDED: "bg-emerald-500",
  SUBMITTED: "bg-amber-500",
  EVALUATED: "bg-violet-500",
  APPROVED: "bg-green-600",
  REJECTED: "bg-red-400",
  PAID: "bg-emerald-600",
};

/** One milestone in a dashboard list — links to the shared detail workbench. */
export default function MilestoneRow({
  milestone,
  role,
  projectTitle,
  clientName,
}: {
  milestone: Milestone;
  role: "client" | "freelancer";
  projectTitle?: string | null;
  clientName?: string | null;
}) {
  const step = nextStepFor(milestone.status as MilestoneStatus, role);
  const progress = progressPercent(milestone.status as MilestoneStatus);
  const demo = isDemoMilestone(milestone);
  return (
    <Reveal>
      <Link
        href={`/milestones/${milestone.id}`}
        className="card-surface card-hover group block rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold tracking-[-0.01em] text-neutral-900 transition-colors group-hover:text-brand-navy">
                {milestone.title}
              </p>
              <StatusChip status={milestone.status as MilestoneStatus} />
              {demo ? <DemoBadge /> : null}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700 tnum">
                {formatMoney(milestone.amountCents, milestone.currency)}
              </span>
              {projectTitle ? ` · ${projectTitle}` : ""}
              {clientName ? ` · client ${clientName}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_STYLES[step.tone]}`}
            >
              {step.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
              <CalendarDays className="h-3 w-3" />
              {milestone.deadline ? `Due ${formatDate(milestone.deadline)}` : "No deadline set"}
            </span>
          </div>
        </div>
        <div className="mt-3.5 flex items-center gap-3">
          <AnimatedBar
            percent={progress}
            className="h-1.5 flex-1 rounded-full bg-neutral-100"
            barClassName={PROGRESS_TONE[milestone.status as MilestoneStatus]}
          />
          <span className="w-9 text-right text-[10px] font-semibold text-neutral-400 tnum">
            {progress}%
          </span>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400">
          Updated {formatTimestamp(milestone.updatedAt)}
        </p>
      </Link>
    </Reveal>
  );
}
