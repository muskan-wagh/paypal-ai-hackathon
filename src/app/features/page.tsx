import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Eye,
  FileText,
  ListChecks,
  Lock,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import PublicHeader from "@/components/public-header";
import SiteFooter from "@/components/site-footer";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const FOR_CLIENT = [
  {
    icon: ListChecks,
    title: "AI-scoped acceptance criteria",
    blurb: "Briefs become objective checklists before a cent is committed — scope arguments end before they start.",
  },
  {
    icon: Wallet,
    title: "Milestone escrow funding",
    blurb: "Fund exactly the agreed amount through PayPal. Capture is amount-verified server-side (AMOUNT_MISMATCH guard).",
  },
  {
    icon: Eye,
    title: "Audit-ready evaluations",
    blurb: "Every submission comes back with per-item verdicts, explanations, a score and the exact AI model that produced it.",
  },
  {
    icon: ShieldCheck,
    title: "Approve, reject, then release",
    blurb: "You keep the payment trigger. Approve when it's right; request changes when it isn't.",
  },
];

const FOR_FREELANCER = [
  {
    icon: FileText,
    title: "Criteria you can see upfront",
    blurb: "You're graded against the checklist you accepted — no moving goalposts mid-project.",
  },
  {
    icon: RefreshCcw,
    title: "Revision loop, not a cliff",
    blurb: "Structured rejection notes make resubmission a working loop rather than a black box.",
  },
  {
    icon: Banknote,
    title: "PayPal payouts, tracked",
    blurb: "Watch your milestone move from APPROVED to a PayPal payout batch you can follow in Earnings.",
  },
  {
    icon: ScrollText,
    title: "A portfolio of proof",
    blurb: "Completed milestones keep their evaluations, so delivered quality is documented.",
  },
];

const PLATFORM = [
  {
    icon: Lock,
    title: "Server-enforced state machine",
    blurb: "DRAFT → CHECKLISTED → INVITED → ACCEPTED → FUNDED → SUBMITTED → EVALUATED → APPROVED → PAID. The browser never gets to choose.",
  },
  {
    icon: Eye,
    title: "Vision + document AI",
    blurb: "Screenshots are graded visually; PDFs are parsed and evaluated as text. Unsupported files fail with clear errors instead of guessing.",
  },
  {
    icon: ScrollText,
    title: "Append-only event ledger",
    blurb: "Every create, fund, submit, evaluate, approve and payout lands in an events table the timeline UI is built from.",
  },
];

export default async function FeaturesPage() {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader user={user} />
      <main>
        <section className="bg-brand-wash py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight text-brand-navy">Features</h1>
            <p className="mt-3 max-w-2xl text-lg text-neutral-600">
              Everything ProofPay adds around the payment — so the payment itself stays boring and
              safe.
            </p>
          </div>
        </section>

        {[
          { label: "If you're hiring", tone: "text-blue-700 bg-blue-100", items: FOR_CLIENT },
          { label: "If you're working", tone: "text-emerald-700 bg-emerald-100", items: FOR_FREELANCER },
          { label: "Under the hood", tone: "text-violet-700 bg-violet-100", items: PLATFORM },
        ].map((group) => (
          <section key={group.label} className="border-b border-neutral-200 py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${group.tone}`}>
                {group.label}
              </span>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {group.items.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <item.icon className="h-5 w-5 text-brand" />
                    <h2 className="mt-3 font-semibold text-neutral-900">{item.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{item.blurb}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="py-16 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-navy"
          >
            Run a sandbox milestone yourself <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
