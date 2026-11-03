import type { LucideIcon } from "lucide-react";

export default function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}
