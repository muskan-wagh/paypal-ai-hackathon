import Link from "next/link";
import Brand from "@/components/brand";
import type { User } from "@/db/schema";

/** Public (marketing) header — sticky, white-on-grey, PayPal-style nav. */
export default function PublicHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 md:flex">
            <Link href="/how-it-works" className="hover:text-brand-navy">
              How it works
            </Link>
            <Link href="/features" className="hover:text-brand-navy">
              Features
            </Link>
            <Link href="/how-it-works#security" className="hover:text-brand-navy">
              Security
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-brand px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-brand-navy"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-medium text-neutral-700 hover:text-brand-navy">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-brand-navy"
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
