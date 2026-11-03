import type { ReactNode } from "react";

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
      <aside className="hidden flex-col justify-between bg-brand-navy p-10 text-white lg:flex">
        <div>
          <p className="text-lg font-bold tracking-tight">
            Proof<span className="text-brand-sky">Pay</span>
          </p>
          <h1 className="mt-10 max-w-md text-3xl font-bold leading-tight">
            Freelance payments both sides can trust.
          </h1>
          <ul className="mt-8 space-y-5">
            {highlights.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg viewBox="0 0 20 20" className="h-3 w-3 text-brand-sky" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 0 1 1.4-1.4l3.9 3.9 6.7-6.7a1 1 0 0 1 1.4 0Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-white/70">{item.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/50">
          Sandbox demo — all payments are PayPal play money. Built for the PayPal AI Hackathon 2026.
        </p>
      </aside>
      <main className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <p className="text-lg font-bold tracking-tight text-brand-navy lg:hidden">
            Proof<span className="text-brand">Pay</span>
          </p>
          <h2 className="mt-6 text-2xl font-bold text-neutral-900 lg:mt-0">{heading}</h2>
          <p className="mt-1 text-sm text-neutral-500">{subheading}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
