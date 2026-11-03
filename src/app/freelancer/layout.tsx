import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import type { NavItem } from "@/components/dashboard-shell";
import DashboardShell from "@/components/dashboard-shell";
import { getDatabase } from "@/db";
import { invitations } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FreelancerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "freelancer") redirect("/dashboard");

  const pending = getDatabase()
    .select({ count: sql<number>`count(*)` })
    .from(invitations)
    .where(and(eq(invitations.inviteeEmail, user.email!), eq(invitations.status, "pending")))
    .get();
  const pendingCount = Number(pending?.count ?? 0);

  const items: NavItem[] = [
    { href: "/freelancer/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/freelancer/invitations", label: "Invitations", icon: "inbox", badgeCount: pendingCount },
    { href: "/freelancer/earnings", label: "Earnings", icon: "banknote" },
    { href: "/freelancer/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <DashboardShell user={user} items={items}>
      {children}
    </DashboardShell>
  );
}
