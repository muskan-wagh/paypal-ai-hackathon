import type { MilestoneStatus } from "@/lib/state-machine";

const STATUS_STYLES: Record<MilestoneStatus, { chip: string; dot: string }> = {
  DRAFT: { chip: "bg-neutral-100 text-neutral-600 border-neutral-200", dot: "bg-neutral-400" },
  CHECKLISTED: { chip: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  INVITED: { chip: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  ACCEPTED: { chip: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  FUNDED: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  SUBMITTED: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  EVALUATED: { chip: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  APPROVED: { chip: "bg-green-100 text-green-800 border-green-300", dot: "bg-green-600" },
  REJECTED: { chip: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  PAID: { chip: "bg-neutral-900 text-white border-neutral-900", dot: "bg-brand-sky" },
};

/** Status pill with a leading state dot — one visual language app-wide. */
export default function StatusChip({ status }: { status: MilestoneStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${style.chip}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
