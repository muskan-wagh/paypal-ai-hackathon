import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Banknote, Clock3, Inbox } from "lucide-react";
import PageHeader from "@/components/page-header";
import StatTile from "@/components/stat-tile";
import DemoBadge from "@/components/demo-badge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDatabase } from "@/db";
import { milestones, payouts } from "@/db/schema";
import { isDemoPayout } from "@/lib/demo";
import { formatMoney, formatTimestamp } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "freelancer") redirect("/dashboard");
  const db = getDatabase();

  const myPayouts = db
    .select({ payout: payouts, currency: milestones.currency, milestoneTitle: milestones.title })
    .from(payouts)
    .innerJoin(milestones, eq(payouts.milestoneId, milestones.id))
    .where(eq(milestones.freelancerId, user.id))
    .orderBy(desc(payouts.createdAt))
    .all();

  const assigned = db.select().from(milestones).where(eq(milestones.freelancerId, user.id)).all();
  const earnedTotal = myPayouts.reduce((sum, row) => sum + row.payout.amountCents, 0);
  const approvedNotPaid = assigned
    .filter((m) => m.status === "APPROVED")
    .reduce((sum, m) => sum + m.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Freelancer workspace"
        title="Earnings"
        description={`Payouts delivered to your PayPal sandbox account after each milestone approval.`}
      />

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <StatTile
            label="Received"
            value={earnedTotal}
            currency="USD"
            sub="paid out via PayPal"
            icon={Banknote}
            tone="emerald"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Awaiting release"
            value={approvedNotPaid}
            currency="USD"
            sub="approved, payout pending"
            icon={Clock3}
            tone={approvedNotPaid > 0 ? "amber" : "brand"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile label="Payouts" value={myPayouts.length} sub="completed batches" icon={Inbox} tone="sky" />
        </StaggerItem>
      </Stagger>

      <Reveal>
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="font-semibold tracking-tight text-neutral-900">Payout history</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Each row is a PayPal Payouts batch created by the client after approval. Rows marked
              “Sample” are seeded demo data (batch ids prefixed <code>DEMO-</code>) — no PayPal call
              was made for them.
            </p>
          </div>
          {myPayouts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No payouts yet. Deliver great work — the money follows the approval.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Batch
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Milestone
                  </TableHead>
                  <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:table-cell">
                    Receiver
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Amount
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Status
                  </TableHead>
                  <TableHead className="hidden pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:table-cell">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPayouts.map((row) => (
                  <TableRow key={row.payout.id}>
                    <TableCell className="pl-5 font-mono text-xs text-neutral-600">
                      {row.payout.batchId}
                      {isDemoPayout(row.payout) ? <DemoBadge label="Sample" className="ml-2" /> : null}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs font-medium text-neutral-700">
                      {row.milestoneTitle}
                    </TableCell>
                    <TableCell className="hidden text-xs text-neutral-500 sm:table-cell">
                      {row.payout.receiver}
                    </TableCell>
                    <TableCell className="text-right font-semibold tnum">
                      {formatMoney(row.payout.amountCents, row.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {row.payout.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden pr-5 text-right text-xs text-neutral-400 sm:table-cell">
                      {formatTimestamp(row.payout.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </Reveal>
    </div>
  );
}
