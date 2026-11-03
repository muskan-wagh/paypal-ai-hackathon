import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { NavItem } from "@/components/dashboard-shell";
import MilestoneRow from "@/components/milestone-row";
import DashboardShell from "@/components/dashboard-shell";
import { getDatabase } from "@/db";
import { milestones } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MilestonesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const role = user.role === "client" ? "client" : "freelancer";

  const rows = await getDatabase()
    .select({ milestone: milestones })
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">All milestones</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Every milestone moves through AI checklist → invite → funding → proof → evaluation →
            human approval → payout.
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="font-medium text-neutral-700">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
              {role === "client"
                ? "Create a project and add your first milestone to get started."
                : "Milestones assigned to you will appear here."}
            </p>
          </div>
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
