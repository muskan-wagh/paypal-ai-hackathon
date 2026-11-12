import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";
import type { NavItem } from "@/components/dashboard-shell";
import MilestoneRow from "@/components/milestone-row";
import DashboardShell from "@/components/dashboard-shell";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { getDatabase } from "@/db";
import { milestones } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MilestonesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const role = user.role === "client" ? "client" : "freelancer";

  const rows = await (await getDatabase()).select({ milestone: milestones })
    .from(milestones)
    .where(role === "client" ? eq(milestones.clientId, user.id) : eq(milestones.freelancerId, user.id))
    .orderBy(desc(milestones.updatedAt));

  const nav: NavItem[] =
    role === "client"
      ? [
          { href: "/client/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
          { href: "/client/projects", label: "Projects", icon: "projects" },
          { href: "/client/payments", label: "Payments", icon: "wallet" },
        ]
      : [
          { href: "/freelancer/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
          { href: "/freelancer/invitations", label: "Invitations", icon: "inbox" },
          { href: "/freelancer/earnings", label: "Earnings", icon: "banknote" },
        ];

  return (
    <DashboardShell user={user} items={nav}>
      <div className="space-y-6">
        <PageHeader
          eyebrow={role === "client" ? "Client workspace" : "Freelancer workspace"}
          title="All milestones"
          description="Every milestone moves through AI checklist → invite → funding → proof → evaluation → human approval → payout."
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nothing here yet"
            body={
              role === "client"
                ? "Create a project and add your first milestone to get started."
                : "Milestones assigned to you will appear here."
            }
          />
        ) : (
          <div className="space-y-3">
            {rows.map(({ milestone }) => (
              <MilestoneRow key={milestone.id} milestone={milestone} role={role} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
