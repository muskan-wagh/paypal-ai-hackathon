import Link from "next/link";
import type { User } from "@/db/schema";
import { logout } from "@/app/actions/auth";

export default async function AppHeader({ user }: { user: User | null }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <Link href={user ? "/milestones" : "/"} className="font-bold tracking-tight">
        ProofPay
        <span className="ml-2 text-xs font-normal text-neutral-500">AI-gated milestone payouts</span>
      </Link>
      {user ? (
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.role === "client"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {user.role}
          </span>
          <span className="font-medium">{user.name}</span>
          <form action={logout}>
            <button type="submit" className="text-neutral-500 hover:text-neutral-900">
              Log out
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="text-sm text-neutral-600 hover:text-neutral-900">
          Log in
        </Link>
      )}
    </header>
  );
}
