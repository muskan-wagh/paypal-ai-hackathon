import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/public-header";
import SiteFooter from "@/components/site-footer";
import PageHeader from "@/components/page-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "1",
    actor: "Client",
    title: "Create the project & milestone",
    blurb:
      "The client describes the work: title, brief, amount, deadline. A project groups milestones into one engagement.",
  },
  {
    n: "2",
    actor: "AI",
    title: "Get an acceptance checklist",
    blurb:
      "From the brief, the AI drafts per-item acceptance criteria — visual, scope and quality checks — that both sides can read before any money moves.",
  },
  {
    n: "3",
    actor: "Client",
    title: "Invite the freelancer",
    blurb:
      "The client invites a freelancer to a milestone with a secure, expiring token. The invite lands in the freelancer's dashboard.",
  },
  {
    n: "4",
    actor: "Freelancer",
    title: "Accept the milestone",
    blurb:
      "Accepting binds the freelancer to the milestone: they see the amount, deadline and the full acceptance checklist they'll be graded on.",
  },
  {
    n: "5",
    actor: "Client",
    title: "Fund it through PayPal",
    blurb:
      "PayPal Checkout collects the exact milestone amount. The order is created server-side and the capture is verified against the agreed amount before anything advances.",
  },
  {
    n: "6",
    actor: "Freelancer",
    title: "Deliver the work",
    blurb: "Proof ships as screenshots or PDFs plus notes, straight from the freelancer's dashboard.",
  },
  {
    n: "7",
    actor: "AI",
    title: "Proof gets evaluated",
    blurb:
      "The AI grades the submission item-by-item against the checklist — pass / partial / fail with written explanations and a 0–100 overall score.",
  },
  {
    n: "8",
    actor: "Client",
    title: "Approve — or request changes",
    blurb:
      "The client reads the evaluation, reviews files, then approves. Rejection sends structured revision notes back to the freelancer for resubmission.",
  },
  {
    n: "9",
    actor: "Client",
    title: "Release the payout",
    blurb:
      "Approval arms the payout. The client sends it; PayPal Payouts delivers to the freelancer's PayPal. An append-only ledger records every step.",
  },
];

const ACTOR_TONE: Record<string, string> = {
  AI: "bg-violet-100 text-violet-700",
  Client: "bg-blue-100 text-blue-700",
  Freelancer: "bg-emerald-100 text-emerald-700",
};

export default async function HowItWorksPage() {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader user={user} />
      <main>
        <section className="relative overflow-hidden border-b border-neutral-200/70 bg-brand-wash py-16">
          <div className="bg-grid mask-fade-y pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <PageHeader
              eyebrow="The workflow"
              title="How it works"
              description="Nine governed steps from brief to payout. Every step is permission-checked, state-machine-guarded, and recorded in an append-only audit ledger."
            />
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <ol className="relative space-y-5">
              <span
                aria-hidden
                className="absolute bottom-4 left-[18px] top-4 w-px bg-gradient-to-b from-brand/30 via-neutral-200 to-transparent"
              />
              {STEPS.map((step, i) => (
                <Reveal key={step.n} delay={Math.min(i * 0.05, 0.3)}>
                  <li className="relative flex gap-4">
                    <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-brand to-brand-navy text-sm font-bold text-white shadow-[0_6px_14px_-4px_rgb(0_112_186/0.5)] ring-4 ring-white">
                      {step.n}
                    </span>
                    <div className="card-surface card-hover flex-1 rounded-2xl p-5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          ACTOR_TONE[step.actor] ?? "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {step.actor}
                      </span>
                      <h2 className="mt-2 font-semibold tracking-tight text-neutral-900">
                        {step.title}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-500">{step.blurb}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section id="security" className="border-t border-neutral-200/70 bg-brand-wash py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Security
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-neutral-900">
                What the AI can&apos;t do
              </h2>
            </Reveal>
            <Stagger className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2" gap={0.08}>
              {[
                "It holds no PayPal credentials — capture, capture-verification and payouts are server-side only.",
                "It can't advance a milestone's state on its own; AI failures leave the state unchanged.",
                "It can't approve work or send payouts — those are human, role-checked actions.",
                "The amounts it scores against are the server-recorded order amounts, never browser-supplied.",
              ].map((line) => (
                <StaggerItem key={line}>
                  <p className="card-surface flex h-full items-start gap-2.5 rounded-xl p-4 text-sm text-neutral-600">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {line}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
            <Reveal delay={0.2}>
              <Link
                href="/register"
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgb(0_112_186/0.5)] transition hover:bg-brand-navy"
              >
                Try it on the sandbox <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
