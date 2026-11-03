import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import PublicHeader from "@/components/public-header";
import SiteFooter from "@/components/site-footer";
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
    blurb:
      "Proof ships as screenshots or PDFs plus notes, straight from the freelancer's dashboard.",
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

export default async function HowItWorksPage() {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader user={user} />
      <main>
        <section className="bg-brand-wash py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight text-brand-navy">How it works</h1>
            <p className="mt-3 max-w-2xl text-lg text-neutral-600">
              Nine governed steps from brief to payout. Every step is permission-checked,
              state-machine-guarded, and recorded in an append-only audit ledger.
            </p>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <ol className="space-y-6">
              {STEPS.map((step) => (
                <li key={step.n} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                    {step.n}
                  </span>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        step.actor === "AI"
                          ? "bg-violet-100 text-violet-700"
                          : step.actor === "Client"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {step.actor}
                    </span>
                    <h2 className="mt-2 font-semibold text-neutral-900">{step.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-500">{step.blurb}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="security" className="border-t border-neutral-200 bg-brand-wash py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Lock className="mx-auto h-8 w-8 text-brand" />
            <h2 className="mt-3 text-2xl font-bold text-neutral-900">What the AI can&apos;t do</h2>
            <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
              {[
                "It holds no PayPal credentials — capture, capture-verification and payouts are server-side only.",
                "It can't advance a milestone's state on its own; AI failures leave the state unchanged.",
                "It can't approve work or send payouts — those are human, role-checked actions.",
                "The amounts it scores against are the server-recorded order amounts, never browser-supplied.",
              ].map((line) => (
                <p key={line} className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                  {line}
                </p>
              ))}
            </div>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Try it on the sandbox <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
