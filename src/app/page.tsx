import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Eye,
  ListChecks,
  Lock,
  ShieldCheck,
  UserCheck,
  Wallet,
} from "lucide-react";
import PublicHeader from "@/components/public-header";
import SiteFooter from "@/components/site-footer";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const FLOW: Array<{ label: string; className: string }> = [
  { label: "Draft", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  { label: "Checklisted", className: "bg-sky-50 text-sky-700 border-sky-200" },
  { label: "Invited", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { label: "Accepted", className: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Funded", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Submitted", className: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Evaluated", className: "bg-violet-50 text-violet-700 border-violet-200" },
  { label: "Approved", className: "bg-green-100 text-green-800 border-green-300" },
  { label: "Paid", className: "bg-neutral-900 text-white border-neutral-900" },
];

const STEPS = [
  {
    n: "1",
    title: "Brief it, AI scopes it",
    blurb: "The client writes the milestone. AI turns it into an objective acceptance checklist both sides see.",
  },
  {
    n: "2",
    title: "Invite & fund in escrow",
    blurb: "The freelancer accepts the invite, then the client funds the milestone through PayPal.",
  },
  {
    n: "3",
    title: "Deliver proof",
    blurb: "Work ships as screenshots and documents. AI scores the proof against the agreed checklist.",
  },
  {
    n: "4",
    title: "Approve & pay out",
    blurb: "The client reviews the AI evaluation and approves. PayPal Payouts sends the money instantly.",
  },
];

const FEATURES = [
  {
    icon: ListChecks,
    title: "AI acceptance checklists",
    blurb: "Every milestone gets per-item, checkable criteria — visual, scope, quality — generated from the brief before any money moves.",
  },
  {
    icon: Eye,
    title: "AI proof evaluation",
    blurb: "Submissions are graded item-by-item with a 0–100 score, per-item verdicts, and written explanations the client can audit.",
  },
  {
    icon: Wallet,
    title: "Escrow-style funding",
    blurb: "Milestones are funded up front through PayPal checkout and captured against the exact agreed amount.",
  },
  {
    icon: UserCheck,
    title: "Human approval gate",
    blurb: "AI never releases money. Only the milestone's client can approve, revoke, and send the payout.",
  },
  {
    icon: Banknote,
    title: "PayPal Payouts",
    blurb: "Approved milestones pay out to the freelancer's PayPal with idempotent, server-side batch creation.",
  },
  {
    icon: ShieldCheck,
    title: "Auditable by design",
    blurb: "An append-only event ledger records every action — who did what, when, with which model.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader user={user} />

      {/* Hero */}
      <section className="border-b border-neutral-200 bg-brand-wash">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-white px-3 py-1 text-xs font-semibold text-brand-navy">
              <Lock className="h-3.5 w-3.5" /> PayPal sandbox — play money, real APIs
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-brand-navy sm:text-5xl">
              Freelance payments both sides can trust.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-neutral-600">
              ProofPay funds freelance milestones in PayPal escrow, grades delivered work with AI
              against an agreed checklist — and only your approval releases the payout.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition hover:border-brand hover:text-brand-navy"
              >
                See how it works
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                ["9 states", "governed flow"],
                ["100%", "human-approved payouts"],
                ["2 roles", "client · freelancer"],
              ].map(([k, v]) => (
                <div key={v} className="rounded-xl border border-neutral-200 bg-white px-3 py-3 shadow-sm">
                  <dt className="text-sm font-bold text-brand-navy">{k}</dt>
                  <dd className="mt-0.5 text-[11px] leading-tight text-neutral-500">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Product mock — milestone card with governed flow */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-lg shadow-neutral-200/60">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Milestone · Landing page hero redesign
                  </p>
                  <p className="mt-1 text-xl font-bold text-neutral-900">$250.00</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  FUNDED
                </span>
              </div>
              <div className="mt-4 space-y-2.5 text-sm">
                {[
                  ["Hero copy & illustration delivered", "Pass"],
                  ["CTA routes to signup", "Pass"],
                  ["Design matches style guide", "Pass"],
                  ["Source files exported", "Partial"],
                ].map(([item, verdict]) => (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-2">
                    <span className="text-neutral-700">{item}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        verdict === "Pass" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {verdict}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                Score <span className="font-semibold text-neutral-800">92/100</span> — awaiting client
                approval before payout.
              </p>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-md sm:block">
              <p className="text-[11px] font-semibold text-neutral-500">Payout batch</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-600">PAYMENT.SENT · $250.00</p>
            </div>
          </div>
        </div>
      </section>

      {/* State machine strip */}
      <section className="border-b border-neutral-200 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Every milestone moves through a server-enforced state machine
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {FLOW.map((state, index) => (
              <span key={state.label} className="flex items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${state.className}`}
                >
                  {state.label}
                </span>
                {index < FLOW.length - 1 && <span className="text-neutral-300">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-neutral-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">How it works</h2>
            <p className="mt-2 text-neutral-600">
              Four steps from brief to payout — each one visible to both parties, each one leaving an
              audit trail.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{step.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-neutral-200 bg-brand-wash py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
              Trust, engineered in
            </h2>
            <p className="mt-2 text-neutral-600">
              The parts of a freelance deal that usually break down — scope, proof, release — are the
              parts ProofPay instruments.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-brand-navy">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-neutral-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{feature.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guardrails */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-brand" />
          <h2 className="mt-3 text-2xl font-bold text-neutral-900">AI works for both sides. Humans move the money.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            The AI writes checklists and grades proof — but it holds no PayPal credentials. Transitions
            between states are enforced server-side, amounts are verified against the captured order,
            payouts are idempotent, and only the milestone&apos;s client can approve and release funds.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-200 bg-brand-navy py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Ship the work. Show the proof. Get paid.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-white/70">
            Create a free account and run a full client-to-freelancer milestone on the PayPal
            sandbox — no real money anywhere in the system.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-navy transition hover:bg-white/90"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
