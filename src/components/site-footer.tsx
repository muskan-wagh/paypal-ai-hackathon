import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="text-sm font-bold text-brand-navy">ProofPay</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            AI-gated milestone payouts. Escrow via PayPal, acceptance checklists and proof
            evaluation via AI, releases only on explicit human approval.
          </p>
        </div>
        <div className="flex gap-14 text-xs">
          <div className="space-y-2">
            <p className="font-semibold text-neutral-700">Product</p>
            <Link href="/how-it-works" className="block text-neutral-500 hover:text-brand-navy">
              How it works
            </Link>
            <Link href="/features" className="block text-neutral-500 hover:text-brand-navy">
              Features
            </Link>
            <Link href="/register" className="block text-neutral-500 hover:text-brand-navy">
              Get started
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-neutral-700">Demo</p>
            <Link href="/login" className="block text-neutral-500 hover:text-brand-navy">
              Log in
            </Link>
            <p className="text-neutral-400">PayPal sandbox — play money only</p>
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
