"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { User } from "@/db/schema";
import { LogOut, Menu, LayoutDashboard, Briefcase, Wallet, Settings, Inbox, Banknote, type LucideIcon } from "lucide-react";

/** Icons are passed by name across the RSC boundary; resolved client-side. */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: Briefcase,
  wallet: Wallet,
  settings: Settings,
  inbox: Inbox,
  banknote: Banknote,
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  badgeCount?: number;
  exact?: boolean;
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-accent text-brand-navy"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      }`}
    >
      <Icon className={`h-4.5 w-4.5 ${active ? "text-brand" : "text-neutral-400"}`} />
      <span className="flex-1">{item.label}</span>
      {item.badgeCount ? (
        <Badge className="rounded-full bg-brand px-2 py-0 text-[11px] text-white">
          {item.badgeCount}
        </Badge>
      ) : null}
    </Link>
  );
}

function SideNav({
  items,
  pathname,
  role,
}: {
  items: NavItem[];
  pathname: string;
  role: string;
}) {
  return (
    <nav className="space-y-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
        {role === "client" ? "Client workspace" : "Freelancer workspace"}
      </p>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return <NavLink key={item.href} item={item} active={active} />;
      })}
    </nav>
  );
}

/**
 * Authenticated app shell: fixed sidebar (desktop), slide-over (mobile),
 * and a topbar with the user menu. Role-specific nav comes from the layouts.
 */
export default function DashboardShell({
  user,
  items,
  children,
}: {
  user: Pick<User, "name" | "role" | "email">;
  items: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-neutral-200 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandMark className="h-7 w-7" />
          <span className="text-base font-bold tracking-tight text-brand-navy">
            Proof<span className="text-brand">Pay</span>
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SideNav items={items} pathname={pathname} role={user.role} />
      </div>
      <div className="border-t border-neutral-200 p-4">
        <div className="rounded-lg bg-brand-wash p-3 text-xs text-neutral-500">
          <p className="font-semibold text-neutral-700">Sandbox mode</p>
          <p className="mt-0.5 leading-relaxed">
            All payments run on the PayPal sandbox — no real money moves.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-wash">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-neutral-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar lives in the topbar (Sheet below) */}
      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur lg:pl-64">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-1">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`hidden rounded-full sm:inline-flex ${
                user.role === "client"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {user.role}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-3 transition hover:shadow-sm"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-[11px] font-bold text-white">
                      {initials}
                    </span>
                    <span className="hidden text-sm font-medium text-neutral-700 sm:block">
                      {user.name}
                    </span>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                  <p className="text-xs font-normal text-neutral-500">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <Link
                      href={user.role === "client" ? "/client/settings" : "/freelancer/settings"}
                    />
                  }
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 outline-none transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
