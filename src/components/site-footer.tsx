import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Brand from "@/components/brand";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/features", label: "Features" },
      { href: "/register", label: "Get started" },
    ],
  },
  {
    heading: "Demo",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="max-w-sm">
          <Brand />
          <p className="mt-3 text-xs leading-relaxed text-neutral-500">
            AI-gated milestone payouts. Escrow via PayPal, acceptance checklists and proof evaluation
            via AI, releases only on explicit human approval.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {column.heading}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-neutral-500 transition-colors hover:text-brand-navy"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Sandbox notice
          </p>
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-brand-wash p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p className="text-xs leading-relaxed text-neutral-500">
              Every payment in this environment runs on the PayPal sandbox — play money only, real
              APIs.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-4">
        <p className="mx-auto max-w-6xl px-4 text-[11px] text-neutral-400 sm:px-6">
          Built for the PayPal AI Hackathon 2026. Not affiliated with PayPal. All payments run on the
          PayPal sandbox.
        </p>
      </div>
    </footer>
  );
}
