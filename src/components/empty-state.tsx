import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Shared empty state: icon, title, explanation, optional action. */
export default function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center rounded-2xl border-dashed p-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-brand-navy">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-semibold text-neutral-800">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-neutral-500">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Compact inline empty note used inside side panels. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-neutral-500">{children}</p>;
}

export function EmptyLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-sm font-semibold text-brand hover:underline">
      {children}
    </Link>
  );
}
