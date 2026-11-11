import type { ReactNode } from "react";

/** Strong page header with contextual description and an actions slot. */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">{eyebrow}</p>
        ) : null}
        <h1 className="mt-0.5 text-[1.55rem] font-bold leading-tight tracking-[-0.02em] text-neutral-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-500">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
    </div>
  );
}
