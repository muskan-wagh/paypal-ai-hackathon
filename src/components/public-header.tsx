import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Brand from "@/components/brand";
import type { User } from "@/db/schema";

/** Public (marketing) header — sticky, blurred, PayPal-style nav. */
export default function PublicHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 md:flex">
            <Link href="/how-it-works" className="transition-colors hover:text-brand-navy">
              How it works
            </Link>
            <Link href="/features" className="transition-colors hover:text-brand-navy">
              Features
            </Link>
            <Link href="/how-it-works#security" className="transition-colors hover:text-brand-navy">
              Security
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-brand-navy"
            >
              Go to dashboard
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-medium text-neutral-700 transition-colors hover:text-brand-navy">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand px-4 py-2 font-semibold text-white shadow-[0_4px_12px_-3px_rgb(0_112_186/0.5)] transition hover:bg-brand-navy"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
