"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand";
import { PageFade } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { User } from "@/db/schema";
import {
  Banknote,
  Bell,
  Briefcase,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

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
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-sky"
        />
      )}
      <Icon
        className={`h-4.5 w-4.5 transition-colors ${
          active ? "text-brand-sky" : "text-white/40 group-hover:text-white/70"
        }`}
      />
      <span className="flex-1">{item.label}</span>
      {item.badgeCount ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-sky px-1.5 text-[11px] font-bold text-white">
          {item.badgeCount}
        </span>
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
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {role === "client" ? "Client workspace" : "Freelancer workspace"}
      </p>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return <NavLink key={item.href} item={item} active={active} />;
      })}
    </nav>
  );
}

function SidebarContent({
  user,
  items,
  pathname,
}: {
  user: Pick<User, "name" | "role" | "email">;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#00234d] via-[#002d6b] to-[#003087]">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8 rounded-[10px]" />
          <span className="text-base font-bold tracking-tight text-white">
            Proof<span className="text-brand-sky">Pay</span>
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SideNav items={items} pathname={pathname} role={user.role} />
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-sky" /> Sandbox mode
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/50">
            All payments run on the PayPal sandbox — no real money moves.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Authenticated app shell: navy sidebar (desktop), slide-over (mobile), and a
 * topbar with notifications, a quick action and the user menu. Role-specific
 * nav comes from the layouts.
 */
export default function DashboardShell({
  user,
  items,
  notifications,
  quickAction,
  children,
}: {
  user: Pick<User, "name" | "role" | "email">;
  items: NavItem[];
  notifications?: { count: number; href: string; label: string };
  quickAction?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sidebar = <SidebarContent user={user} items={items} pathname={pathname} />;

  return (
    <div className="min-h-screen bg-brand-wash">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-neutral-200/80 bg-white/85 backdrop-blur-md lg:pl-64">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
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
            <div className="hidden items-center gap-2 lg:flex">
              <p className="text-sm font-semibold tracking-tight text-neutral-800">
                {user.role === "client" ? "Client workspace" : "Freelancer workspace"}
              </p>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                sandbox
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {quickAction ? (
              <Link
                href={quickAction.href}
                className="hidden items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-navy sm:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" /> {quickAction.label}
              </Link>
            ) : null}
            {notifications ? (
              <Link
                href={notifications.href}
                aria-label={notifications.label}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:border-brand/40 hover:text-brand-navy"
              >
                <Bell className="h-4 w-4" />
                {notifications.count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {notifications.count}
                  </span>
                )}
              </Link>
            ) : null}
            <Badge
              variant="outline"
              className={`hidden rounded-full px-2.5 sm:inline-flex ${
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
                    className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-3 transition hover:border-brand/30 hover:shadow-sm"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-brand to-brand-navy text-[11px] font-bold text-white">
                      {initials}
                    </span>
                    <span className="hidden text-sm font-medium text-neutral-700 sm:block">
                      {user.name}
                    </span>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                    <p className="text-xs font-normal text-neutral-500">{user.email}</p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
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
        <PageFade className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</PageFade>
      </main>
    </div>
  );
}
