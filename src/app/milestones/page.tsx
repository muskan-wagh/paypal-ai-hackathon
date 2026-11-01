import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db";
import { milestones, users as usersTable } from "@/db/schema";
import AppHeader from "@/components/app-header";
import StatusChip from "@/components/status-chip";
import { getSessionUser } from "@/lib/session";
import type { MilestoneStatus } from "@/lib/state-machine";

export const dynamic = "force-dynamic";

export default async function MilestonesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const client = alias(usersTable, "client_table");
  const freelancer = alias(usersTable, "freelancer_table");

  const rows = await getDatabase()
    .select({
      milestone: milestones,
      clientName: client.name,
      freelancerName: freelancer.name,
    })
    .from(milestones)
    .innerJoin(client, eq(milestones.clientId, client.id))
    .leftJoin(freelancer, eq(milestones.freelancerId, freelancer.id))
    .orderBy(desc(milestones.createdAt));

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Milestones</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Every milestone moves through AI checklist → funding → proof → evaluation → human
          approval → payout.
        </p>
        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <a
              key={row.milestone.id}
              href={`/milestones/${row.milestone.id}`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-neutral-900">{row.milestone.title}</span>
                <StatusChip status={row.milestone.status as MilestoneStatus} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{row.milestone.brief}</p>
              <p className="mt-2 text-xs text-neutral-500">
                ${(row.milestone.amountCents / 100).toFixed(2)} {row.milestone.currency} ·
                {" "}
                {row.clientName} → {row.freelancerName ?? "unassigned"}
                {row.milestone.deadline ? ` · due ${row.milestone.deadline}` : ""}
              </p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
