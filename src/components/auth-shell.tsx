import Link from "next/link";
import type { ReactNode } from "react";
import {
  Eye,
  ListChecks,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Reveal } from "@/components/motion";

const HIGHLIGHT_ICONS = [Wallet, ListChecks, Eye, ShieldCheck];

/** PayPal-style split auth shell: navy value panel + white form column. */
export default function AuthShell({
  children,
  heading,
  subheading,
}: {
  children: ReactNode;
  heading: string;
  subheading: string;
}) {
  const highlights = [
    { title: "Milestones funded in escrow", blurb: "PayPal sandbox checkout holds funds before work starts." },
    { title: "AI acceptance checklists", blurb: "Briefs become objective, per-item criteria both parties agree on." },
    { title: "Proof evaluated by AI", blurb: "Screenshots and PDFs scored against the checklist in minutes." },
    { title: "Humans approve every release", blurb: "No payout leaves without an explicit client approval." },
  ];
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-[#00234d] via-[#002d6b] to-[#003087] p-10 text-white lg:flex">
        <div className="bg-grid-dark mask-fade-y pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-brand-sky/15 blur-3xl"
        />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8 rounded-[10px]" />
            <span className="text-lg font-bold tracking-tight">
              Proof<span className="text-brand-sky">Pay</span>
            </span>
          </Link>
          <Reveal>
            <h1 className="mt-12 max-w-md text-3xl font-bold leading-tight tracking-[-0.02em]">
              Freelance payments both sides can trust.
            </h1>
          </Reveal>
          <ul className="mt-10 space-y-6">
            {highlights.map((item, i) => {
              const Icon = HIGHLIGHT_ICONS[i];
              return (
                <Reveal key={item.title} delay={0.1 + i * 0.08}>
                  <li className="flex gap-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                      <Icon className="h-4 w-4 text-brand-sky" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-sm text-white/60">{item.blurb}</p>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">
          Sandbox demo — all payments are PayPal play money. Built for the PayPal AI Hackathon 2026.
        </p>
      </aside>
      <main className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <BrandMark className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight text-brand-navy">
              Proof<span className="text-brand">Pay</span>
            </span>
          </Link>
          <h2 className="mt-6 text-[1.7rem] font-bold tracking-[-0.02em] text-neutral-900 lg:mt-0">
            {heading}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">{subheading}</p>
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
