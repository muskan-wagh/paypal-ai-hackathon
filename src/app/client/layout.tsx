import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import type { NavItem } from "@/components/dashboard-shell";
import DashboardShell from "@/components/dashboard-shell";
import { getDatabase } from "@/db";
import { milestones } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Milestone states where the client is the one who must act. */
const ACTION_STATUSES = ["DRAFT", "CHECKLISTED", "ACCEPTED", "EVALUATED", "APPROVED"];

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");

  const myMilestones = getDatabase()
    .select({ status: milestones.status })
    .from(milestones)
    .where(eq(milestones.clientId, user.id))
    .all();
  const actionCount = myMilestones.filter((m) => ACTION_STATUSES.includes(m.status)).length;

  const items: NavItem[] = [
    { href: "/client/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/client/projects", label: "Projects", icon: "projects" },
    { href: "/client/payments", label: "Payments", icon: "wallet" },
    { href: "/client/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <DashboardShell
      user={user}
      items={items}
      notifications={
        actionCount > 0
          ? {
              count: actionCount,
              href: "/client/dashboard",
              label: `${actionCount} milestone${actionCount === 1 ? "" : "s"} need your action`,
            }
          : { count: 0, href: "/client/dashboard", label: "Notifications" }
      }
      quickAction={{ href: "/client/projects/new", label: "New project" }}
    >
      {children}
    </DashboardShell>
  );
}
