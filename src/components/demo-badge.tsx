/**
 * Amber chip marking seeded demo/sample data. Always driven by the data layer
 * (`src/lib/demo.ts`) — a demo record is flagged in the database, never by
 * hardcoding ids in components.
 */
export default function DemoBadge({
  label = "Demo data",
  title = "Seeded sample data for the ProofPay demo — not a real PayPal transaction.",
  className = "",
}: {
  label?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ${className}`}
    >
      <span aria-hidden>▶</span>
      {label}
    </span>
  );
}
