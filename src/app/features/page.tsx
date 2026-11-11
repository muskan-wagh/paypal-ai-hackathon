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
import PageHeader from "@/components/page-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
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

const GROUPS = [
  {
    label: "If you're hiring",
    icon: Wallet,
    tone: "text-blue-700 bg-blue-100",
    items: FOR_CLIENT,
  },
  {
    label: "If you're working",
    icon: Banknote,
    tone: "text-emerald-700 bg-emerald-100",
    items: FOR_FREELANCER,
  },
  {
    label: "Under the hood",
    icon: Lock,
    tone: "text-violet-700 bg-violet-100",
    items: PLATFORM,
  },
];

export default async function FeaturesPage() {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader user={user} />
      <main>
        <section className="relative overflow-hidden border-b border-neutral-200/70 bg-brand-wash py-16">
          <div className="bg-grid mask-fade-y pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <PageHeader
              eyebrow="Product"
              title="Features"
              description="Everything ProofPay adds around the payment — so the payment itself stays boring and safe."
            />
          </div>
        </section>

        {GROUPS.map((group) => (
          <section key={group.label} className="border-b border-neutral-200/70 py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${group.tone}`}
                >
                  <group.icon className="h-3.5 w-3.5" />
                  {group.label}
                </span>
              </Reveal>
              <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.07}>
                {group.items.map((item) => (
                  <StaggerItem key={item.title}>
                    <div className="card-surface card-hover group h-full rounded-2xl p-6">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-wash text-brand-navy ring-1 ring-neutral-200/70 transition-colors group-hover:bg-brand group-hover:text-white">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <h2 className="mt-4 font-semibold tracking-tight text-neutral-900">
                        {item.title}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{item.blurb}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        ))}

        <section className="py-16 text-center">
          <Reveal>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgb(0_112_186/0.5)] transition hover:bg-brand-navy"
            >
              Run a sandbox milestone yourself <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
