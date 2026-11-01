import type { MilestoneStatus } from "@/lib/state-machine";

const STATUS_STYLES: Record<MilestoneStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600 border-neutral-200",
  CHECKLISTED: "bg-sky-50 text-sky-700 border-sky-200",
  FUNDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
  EVALUATED: "bg-violet-50 text-violet-700 border-violet-200",
  APPROVED: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PAID: "bg-gray-800 text-white border-gray-800",
};

export default function StatusChip({ status }: { status: MilestoneStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
