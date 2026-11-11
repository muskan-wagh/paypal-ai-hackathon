import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Banknote, Clock3, Inbox } from "lucide-react";
import StatTile from "@/components/stat-tile";
import DemoBadge from "@/components/demo-badge";
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
    .select({ payout: payouts, currency: milestones.currency })
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
  const invitedEmail = user.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Earnings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Payouts delivered to your PayPal sandbox account
          {invitedEmail ? ` after each milestone approval.` : "."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Received" value={formatMoney(earnedTotal)} sub="paid out via PayPal" icon={Banknote} />
        <StatTile
          label="Awaiting release"
          value={formatMoney(approvedNotPaid)}
          sub="approved, payout pending"
          icon={Clock3}
        />
        <StatTile
          label="Payouts"
          value={myPayouts.length}
          sub="completed batches"
          icon={Inbox}
        />
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-semibold text-neutral-900">Payout history</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Each row is a PayPal Payouts batch created by the client after approval. Rows marked
            “Sample” are seeded demo data (batch ids prefixed <code>DEMO-</code>) — no PayPal call was
            made for them.
          </p>
        </div>
        {myPayouts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">
            No payouts yet. Deliver great work — the money follows the approval.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead className="hidden sm:table-cell">Receiver</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myPayouts.map((row) => (
                <TableRow key={row.payout.id}>
                  <TableCell className="font-mono text-xs text-neutral-600">
                    {row.payout.batchId}
                    {isDemoPayout(row.payout) ? <DemoBadge label="Sample" className="ml-2" /> : null}
                  </TableCell>
                  <TableCell className="hidden text-xs text-neutral-500 sm:table-cell">{row.payout.receiver}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoney(row.payout.amountCents, row.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {row.payout.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-neutral-400 hidden sm:table-cell">
                    {formatTimestamp(row.payout.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
