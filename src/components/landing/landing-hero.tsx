"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Banknote,
  ListChecks,
  Lock,
  PlayCircle,
  Sparkles,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const CHECKLIST = [
  { item: "Hero copy & illustration delivered", verdict: "Pass" },
  { item: "CTA routes to signup", verdict: "Pass" },
  { item: "Design matches style guide", verdict: "Pass" },
  { item: "Source files exported", verdict: "Partial" },
] as const;

/** Floating ambient glow blobs behind the hero. */
function HeroGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid mask-fade-y absolute inset-0" />
      <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-sky/15 blur-3xl" />
      <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
    </div>
  );
}

/** Animated "AI evaluation → payout release" connector chip. */
function ConnectorChip({
  className,
  children,
  delay,
}: {
  className?: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={`absolute rounded-xl border border-neutral-200/80 bg-white/95 px-3.5 py-2.5 shadow-pop backdrop-blur ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** The animated product mock — milestone card + floating AI/payout chips. */
function HeroMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
      className="relative mx-auto w-full max-w-md"
    >
      {/* Main milestone card */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="relative rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-pop"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Milestone · Hero redesign
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 tnum">$250.00</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> FUNDED · ESCROW
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {CHECKLIST.map((row, i) => (
            <motion.div
              key={row.item}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.15, ease: EASE }}
              className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50/70 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-neutral-700">
                <ListChecks className="h-3.5 w-3.5 text-brand" />
                {row.item}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                  row.verdict === "Pass"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {row.verdict.toUpperCase()}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>AI score</span>
            <span className="font-bold text-neutral-700 tnum">92/100</span>
          </div>
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "92%" }}
            transition={{ duration: 1.1, delay: 1.2, ease: EASE }}
            className="mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-brand to-brand-sky"
          />
          <p className="mt-2.5 border-t border-neutral-100 pt-2.5 text-xs text-neutral-500">
            Awaiting <span className="font-semibold text-neutral-800">client approval</span> before
            payout is released.
          </p>
        </div>
      </motion.div>

      {/* Floating: AI evaluation */}
      <ConnectorChip className="-right-4 -top-6 hidden sm:block" delay={1.1}>
        <p className="flex items-center gap-2 text-xs">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          </span>
          <span>
            <span className="block font-bold text-neutral-800">AI evaluation</span>
            <span className="block text-[10px] text-neutral-400">scored against checklist</span>
          </span>
        </p>
      </ConnectorChip>

      {/* Floating: payout released */}
      <ConnectorChip className="-bottom-7 -left-5 hidden sm:block" delay={1.5}>
        <p className="flex items-center gap-2 text-xs">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100">
            <Banknote className="h-3.5 w-3.5 text-emerald-600" />
          </span>
          <span>
            <span className="block font-bold text-emerald-600">PAYMENT.SENT · $250.00</span>
            <span className="block text-[10px] text-neutral-400">PayPal Payouts · human-approved</span>
          </span>
        </p>
      </ConnectorChip>

      {/* Floating: human approval gate */}
      <ConnectorChip className="-left-8 top-1/3 hidden lg:block" delay={1.3}>
        <p className="flex items-center gap-2 text-xs">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent">
            <Lock className="h-3.5 w-3.5 text-brand-navy" />
          </span>
          <span>
            <span className="block font-bold text-neutral-800">Approval gate</span>
            <span className="block text-[10px] text-neutral-400">AI never moves money</span>
          </span>
        </p>
      </ConnectorChip>
    </motion.div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-neutral-200/70 bg-white">
      <HeroGlow />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        {/* Copy column */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-accent px-3 py-1.5 text-xs font-semibold text-brand-navy">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-sky opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-sky" />
              </span>
              PayPal sandbox — play money, real APIs
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="mt-6 text-[2.6rem] font-bold leading-[1.06] tracking-[-0.03em] text-neutral-900 sm:text-6xl"
          >
            Freelance payments{" "}
            <span className="text-gradient-brand">both sides can trust.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-600"
          >
            ProofPay funds freelance milestones in <strong className="font-semibold text-neutral-800">PayPal escrow</strong>,
            grades delivered work with AI against an agreed checklist — and{" "}
            <strong className="font-semibold text-neutral-800">only your approval</strong> releases
            the payout.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgb(0_112_186/0.5)] transition hover:bg-brand-navy hover:shadow-[0_10px_24px_-6px_rgb(0_48_135/0.55)]"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition hover:border-brand hover:text-brand-navy"
            >
              <PlayCircle className="h-4 w-4" /> Explore how it works
            </Link>
          </motion.div>

          {/* Real platform facts — no invented metrics */}
          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42, ease: EASE }}
            className="mt-10 grid max-w-md grid-cols-3 gap-3"
          >
            {[
              ["9 states", "server-enforced flow"],
              ["100%", "human-approved payouts"],
              ["2 roles", "client · freelancer"],
            ].map(([k, v]) => (
              <div
                key={v}
                className="rounded-xl border border-neutral-200/80 bg-white/70 px-3 py-3 text-center shadow-soft backdrop-blur"
              >
                <dt className="text-base font-bold tracking-tight text-brand-navy">{k}</dt>
                <dd className="mt-0.5 text-[11px] leading-tight text-neutral-500">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* Product mock column */}
        <HeroMock />
      </div>
    </section>
  );
}
