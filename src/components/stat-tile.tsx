import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/motion";

const TONES = {
  brand: "bg-accent text-brand-navy",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600",
} as const;

export type StatTone = keyof typeof TONES;

/**
 * Premium stat card. If `value` is numeric it counts up on scroll into view;
 * pass `currency` to render the interpolated value as money.
 */
export default function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "brand",
  currency,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  tone?: StatTone;
  currency?: string;
}) {
  return (
    <div className="card-surface card-hover rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
          {label}
        </p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[1.7rem] font-bold leading-none tracking-[-0.02em] text-neutral-900 tnum">
        {typeof value === "number" ? (
          <AnimatedNumber value={value} currency={currency} />
        ) : (
          value
        )}
      </p>
      {sub ? <p className="mt-1.5 text-xs leading-snug text-neutral-500">{sub}</p> : null}
    </div>
  );
}
