"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Eye,
  FileText,
  FolderKanban,
  ListChecks,
  Lock,
  Mail,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/* Governed-flow strip — the real state machine                        */
/* ------------------------------------------------------------------ */

const FLOW = ["DRAFT", "CHECKLISTED", "INVITED", "ACCEPTED", "FUNDED", "SUBMITTED", "EVALUATED", "APPROVED", "PAID"];

export function FlowStrip() {
  return (
    <section className="border-b border-neutral-200/70 bg-brand-wash py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Every milestone moves through a server-enforced state machine
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            {FLOW.map((state, index) => (
              <span key={state} className="flex items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                    state === "PAID"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : index >= 4
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-neutral-200 bg-white text-neutral-600"
                  }`}
                >
                  {state}
                </span>
                {index < FLOW.length - 1 && <span aria-hidden className="text-neutral-300">→</span>}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust concept — brief → AI → proof → approval → payout chain        */
/* ------------------------------------------------------------------ */

const CHAIN = [
  { icon: FileText, title: "Brief", sub: "what “done” means" },
  { icon: ListChecks, title: "AI checklist", sub: "objective criteria" },
  { icon: Upload, title: "Proof", sub: "screenshots & docs" },
  { icon: Sparkles, title: "Evaluation", sub: "scored 0–100" },
  { icon: UserCheck, title: "Approval", sub: "human decision" },
  { icon: Banknote, title: "Payout", sub: "PayPal releases" },
];

export function TrustConcept() {
  return (
    <section className="border-b border-neutral-200/70 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                Why ProofPay
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-neutral-900 sm:text-4xl">
                The parts of a freelance deal that break — instrumented.
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-neutral-600">
                Scope arguments, unverifiable deliverables, and the awkward money conversation at
                hand-off. ProofPay turns each one into a visible, auditable step — with the funds
                already in PayPal escrow before work starts.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Scope is agreed before any money moves — AI turns the brief into checkable criteria.",
                  "Proof is graded against the same checklist both sides signed.",
                  "Payout release is a human decision, enforced server-side.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="card-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
              <div className="bg-dots pointer-events-none absolute inset-0 opacity-50" />
              <div className="relative space-y-2.5">
                {CHAIN.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.45, delay: i * 0.1, ease: EASE }}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 shadow-soft"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        step.title === "AI checklist" || step.title === "Evaluation"
                          ? "bg-violet-50 text-violet-600"
                          : step.title === "Approval"
                            ? "bg-accent text-brand-navy"
                            : step.title === "Payout"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <step.icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900">{step.title}</p>
                      <p className="text-xs text-neutral-400">{step.sub}</p>
                    </div>
                    {i < CHAIN.length - 1 ? (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        SENT
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works — animated 4-step process                              */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: "1",
    title: "Brief it, AI scopes it",
    blurb:
      "The client writes the milestone. AI turns it into an objective acceptance checklist both sides see — before any money moves.",
  },
  {
    n: "2",
    title: "Invite & fund in escrow",
    blurb:
      "The freelancer accepts the invite, then the client funds the milestone through PayPal. Funds sit in escrow, not in a stranger's pocket.",
  },
  {
    n: "3",
    title: "Deliver proof",
    blurb:
      "Work ships as screenshots and documents. AI scores the proof against the agreed checklist with per-item verdicts.",
  },
  {
    n: "4",
    title: "Approve & pay out",
    blurb:
      "The client reviews the AI evaluation and approves. PayPal Payouts sends the money instantly — and the ledger records it all.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-neutral-200/70 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-neutral-900 sm:text-4xl">
              Four steps from brief to payout.
            </h2>
            <p className="mt-3 text-neutral-600">
              Each one visible to both parties, each one leaving an audit trail.
            </p>
          </div>
        </Reveal>

        <div className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* connector line (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent lg:block"
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.12}>
              <div className="card-surface card-hover relative h-full rounded-2xl p-5">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-brand to-brand-navy text-base font-bold text-white shadow-[0_6px_14px_-4px_rgb(0_112_186/0.5)]">
                  {step.n}
                </span>
                <h3 className="mt-4 font-semibold tracking-tight text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{step.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features — bento grid                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: ListChecks,
    title: "AI acceptance checklists",
    blurb:
      "Every milestone gets per-item, checkable criteria — visual, scope, quality — generated from the brief before any money moves.",
    span: "lg:col-span-2",
  },
  {
    icon: Eye,
    title: "AI proof evaluation",
    blurb:
      "Submissions graded item-by-item: 0–100 score, per-item verdicts, written explanations the client can audit.",
    span: "",
  },
  {
    icon: Wallet,
    title: "Escrow-style funding",
    blurb:
      "Milestones funded up front through PayPal checkout and captured against the exact agreed amount.",
    span: "",
  },
  {
    icon: UserCheck,
    title: "Human approval gate",
    blurb:
      "AI never releases money. Only the milestone's client can approve, revoke, and send the payout.",
    span: "",
  },
  {
    icon: Banknote,
    title: "PayPal Payouts",
    blurb:
      "Approved milestones pay out to the freelancer's PayPal with idempotent, server-side batch creation.",
    span: "lg:col-span-2",
  },
  {
    icon: ScrollText,
    title: "Auditable by design",
    blurb: "An append-only event ledger records every action — who did what, when, with which model.",
    span: "lg:col-span-3",
  },
];

export function Features() {
  return (
    <section className="border-b border-neutral-200/70 bg-brand-wash py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-neutral-900 sm:text-4xl">
              Trust, engineered in.
            </h2>
          </div>
        </Reveal>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.08}>
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.title} className={feature.span}>
              <div className="card-surface card-hover group h-full rounded-2xl p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-brand-navy transition-colors group-hover:bg-brand group-hover:text-white">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight text-neutral-900">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{feature.blurb}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive client ↔ freelancer toggle                              */
/* ------------------------------------------------------------------ */

const ROLE_VIEW = {
  client: {
    label: "I'm hiring",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    steps: [
      {
        icon: FileText,
        title: "Create the milestone",
        blurb: "Title, brief, amount, deadline. A project groups milestones into one engagement.",
      },
      {
        icon: ListChecks,
        title: "Let AI scope it",
        blurb: "One click drafts per-item acceptance criteria from your brief — edit-free, auditable.",
      },
      {
        icon: Wallet,
        title: "Fund in PayPal escrow",
        blurb: "Checkout captures the exact agreed amount. Verified server-side before work starts.",
      },
      {
        icon: Sparkles,
        title: "Read the evaluation",
        blurb: "When proof arrives, AI grades it item-by-item with explanations you can audit.",
      },
      {
        icon: CheckCircle2,
        title: "Approve & release",
        blurb: "Your call. Approve to send the payout, or request changes with structured notes.",
      },
    ],
  },
  freelancer: {
    label: "I'm working",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    steps: [
      {
        icon: Mail,
        title: "Get invited",
        blurb: "The invite lands in your dashboard with the amount, deadline and full checklist.",
      },
      {
        icon: UserCheck,
        title: "Accept & know the bar",
        blurb: "Accepting binds you to the checklist — no moving goalposts mid-project.",
      },
      {
        icon: Upload,
        title: "Submit proof",
        blurb: "Screenshots or PDFs plus a short note, straight from your dashboard.",
      },
      {
        icon: RefreshCcw,
        title: "Revise if needed",
        blurb: "Rejections come as structured notes, so resubmission is a loop, not a cliff.",
      },
      {
        icon: Banknote,
        title: "Get paid via PayPal",
        blurb: "Approval triggers a PayPal Payouts batch — track it in your Earnings page.",
      },
    ],
  },
} as const;

export function RoleWorkflow() {
  const [role, setRole] = useState<"client" | "freelancer">("client");
  const view = ROLE_VIEW[role];
  return (
    <section className="border-b border-neutral-200/70 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              Two sides, one workflow
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-neutral-900 sm:text-4xl">
              Built for both ends of the deal.
            </h2>
            <div className="mt-6 inline-flex rounded-full border border-neutral-200 bg-brand-wash p-1">
              {(Object.keys(ROLE_VIEW) as Array<keyof typeof ROLE_VIEW>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                    role === key ? "text-white" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {role === key && (
                    <motion.span
                      layoutId="role-pill"
                      className="absolute inset-0 rounded-full bg-brand-navy"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{ROLE_VIEW[key].label}</span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="relative mx-auto mt-10 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.ol
              key={role}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative space-y-3"
            >
              {view.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="card-surface flex items-center gap-4 rounded-2xl p-4 sm:p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-wash text-brand-navy ring-1 ring-neutral-200/70">
                    <step.icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      {step.title}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${view.tone}`}
                      >
                        Step {i + 1}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-500">{step.blurb}</p>
                  </div>
                  {i < view.steps.length - 1 && (
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-neutral-300 sm:block" />
                  )}
                </li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard preview — illustrative workspace mock                     */
/* ------------------------------------------------------------------ */

const PREVIEW_BARS = [42, 65, 38, 82, 55, 90, 70];

export function DashboardPreview() {
  return (
    <section className="relative overflow-hidden border-b border-neutral-200/70 bg-brand-wash py-20 lg:py-24">
      <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              The workspace
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-neutral-900 sm:text-4xl">
              A dashboard that makes the money legible.
            </h2>
            <p className="mt-3 text-neutral-600">
              Stats, pipeline and audit trail for clients; deadlines and payouts for freelancers.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-12">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-pop">
            {/* window chrome */}
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="mx-auto rounded-md bg-white px-3 py-0.5 text-[10px] font-medium text-neutral-400 ring-1 ring-neutral-200">
                app.proofpay.dev — client workspace
              </span>
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-[1.5fr_1fr] sm:p-6">
              {/* stats + chart */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Committed", "$3,450", "in escrow"],
                    ["Needs action", "2", "milestones"],
                    ["Paid out", "$1,150", "via PayPal"],
                  ].map(([label, value, sub]) => (
                    <div key={label} className="rounded-xl border border-neutral-200/80 bg-white p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                        {label}
                      </p>
                      <p className="mt-1 text-lg font-bold tracking-tight text-neutral-900 tnum">
                        {value}
                      </p>
                      <p className="text-[10px] text-neutral-400">{sub}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-neutral-200/80 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neutral-800">Milestone pipeline</p>
                    <p className="text-[10px] text-neutral-400">live state distribution</p>
                  </div>
                  <div className="mt-3 flex h-24 items-end gap-1.5">
                    {PREVIEW_BARS.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: EASE }}
                        className={`flex-1 rounded-t-md ${
                          i === 3 || i === 5 ? "bg-brand-sky/80" : "bg-brand/70"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200/80 bg-white p-4">
                  <div className="space-y-2.5">
                    {[
                      ["Landing page hero redesign", "EVALUATED", "bg-violet-100 text-violet-700", "$250"],
                      ["API integration & tests", "FUNDED", "bg-emerald-50 text-emerald-700", "$800"],
                      ["Brand illustration set", "APPROVED", "bg-green-100 text-green-700", "$350"],
                    ].map(([title, status, tone, amount]) => (
                      <div
                        key={title}
                        className="flex items-center justify-between rounded-lg bg-neutral-50/80 px-3 py-2 text-xs"
                      >
                        <span className="truncate font-medium text-neutral-800">{title}</span>
                        <span className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${tone}`}
                          >
                            {status}
                          </span>
                          <span className="font-semibold text-neutral-600 tnum">{amount}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* audit rail */}
              <div className="rounded-xl border border-neutral-200/80 bg-white p-4">
                <p className="text-xs font-semibold text-neutral-800">Audit trail</p>
                <div className="mt-4 space-y-3.5">
                  {[
                    ["Payout sent via PayPal", "PAYMENT.SENT · $1,150", "text-emerald-600 bg-emerald-50", Banknote],
                    ["Client approved", "human decision recorded", "text-emerald-600 bg-emerald-50", CheckCircle2],
                    ["AI evaluation complete", "score 92/100 · 3 pass · 1 partial", "text-violet-600 bg-violet-50", Sparkles],
                    ["Proof submitted", "3 files · screenshots + pdf", "text-amber-600 bg-amber-50", Upload],
                    ["Funded via PayPal", "captured into escrow", "text-brand bg-accent", Wallet],
                    ["AI checklist generated", "5 acceptance criteria", "text-violet-600 bg-violet-50", ListChecks],
                  ].map(([label, sub, tone, Icon]) => (
                    <div key={label as string} className="flex items-start gap-2.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone as string}`}
                      >
                        {(() => {
                          const I = Icon as typeof Banknote;
                          return <I className="h-3 w-3" />;
                        })()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-neutral-800">{label as string}</p>
                        <p className="truncate text-[10px] text-neutral-400">{sub as string}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <p className="mt-4 text-center text-[11px] text-neutral-400">
            Illustrative workspace — every number in the live app comes from your real milestones and
            PayPal records.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Security & human approval                                           */
/* ------------------------------------------------------------------ */

const GUARDRAILS = [
  "hold PayPal credentials — capture, capture-verification and payouts run server-side only.",
  "advance a milestone's state on its own — AI failures leave the state unchanged.",
  "approve work or send payouts — those are human, role-checked actions.",
  "score against browser-supplied amounts — only server-recorded order values.",
];

export function SecuritySection() {
  return (
    <section className="border-b border-neutral-200/70 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Security & human approval
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-neutral-900 sm:text-4xl">
                AI works for both sides. <span className="text-gradient-brand">Humans move the money.</span>
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-neutral-600">
                The AI writes checklists and grades proof — but it holds no PayPal credentials.
                State transitions are enforced server-side, amounts are verified against the
                captured order, payouts are idempotent, and only the milestone&apos;s client can
                approve and release funds.
              </p>
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-neutral-200 bg-brand-wash p-4">
                <Lock className="h-4 w-4 shrink-0 text-brand" />
                <p className="text-xs leading-relaxed text-neutral-600">
                  Every action lands in an <strong className="font-semibold text-neutral-800">append-only event ledger</strong> —
                  who did what, when, and with which model.
                </p>
              </div>
            </div>
          </Reveal>

          <Stagger className="space-y-3" gap={0.1}>
            {GUARDRAILS.map((line) => (
              <StaggerItem key={line}>
                <div className="card-surface flex items-start gap-3 rounded-xl p-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <span aria-hidden className="text-sm font-bold text-red-500">
                      ✕
                    </span>
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-700">
                    <span className="font-semibold text-neutral-900">The AI can&apos;t</span> {line}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#00234d] via-[#002d6b] to-[#003087] py-20 lg:py-24">
      <div className="bg-grid-dark mask-fade-y pointer-events-none absolute inset-0 opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-sky/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-sky">
            Ready when you are
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-white sm:text-5xl">
            Ship the work. Show the proof. Get paid.
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/70">
            Create a free account and run a full client-to-freelancer milestone on the PayPal
            sandbox — no real money anywhere in the system.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-brand-navy shadow-lg transition hover:bg-white/90"
            >
              Create your account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Log in
            </Link>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/50">
            <FolderKanban className="h-3.5 w-3.5" />
            Demo workspaces are pre-seeded so you can explore both roles instantly.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
