import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import StatTile from "@/components/stat-tile";
import { Banknote, ShieldCheck, Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDatabase } from "@/db";
import { milestones, payouts } from "@/db/schema";
import { formatMoney, formatTimestamp } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import type { MilestoneStatus } from "@/lib/state-machine";

export const dynamic = "force-dynamic";

export default async function ClientPaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");
  const db = getDatabase();

  const myMilestones = db.select().from(milestones).where(eq(milestones.clientId, user.id)).all();
  const myPayouts = db
    .select({ payout: payouts, milestoneTitle: milestones.title, currency: milestones.currency })
    .from(payouts)
    .innerJoin(milestones, eq(payouts.milestoneId, milestones.id))
    .where(eq(milestones.clientId, user.id))
    .orderBy(desc(payouts.createdAt))
    .all();

  const funded = myMilestones.filter((m) => m.paypalOrderId || m.status !== "DRAFT");
  const fundedTotal = funded.reduce((sum, m) => sum + m.amountCents, 0);
  const paidTotal = myPayouts.reduce((sum, row) => sum + row.payout.amountCents, 0);
  const escrowRows = funded.filter((m) => m.status !== "PAID" && m.paypalCaptureId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Payments</h1>
        <p className="mt-1 text-sm text-neutral-500">
          PayPal sandbox funding, captures and payouts for your milestones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Committed" value={formatMoney(fundedTotal)} sub="all funded milestones" icon={Wallet} />
        <StatTile
          label="In escrow"
          value={String(escrowRows.length)}
          sub="captured, awaiting release"
          icon={ShieldCheck}
        />
        <StatTile label="Paid out" value={formatMoney(paidTotal)} sub="released to freelancers" icon={Banknote} />
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-semibold text-neutral-900">Payout batches</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Sent via PayPal Payouts after your approval.</p>
        </div>
        {myPayouts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">
            No payouts yet — approve a milestone, then send the payout from its page.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Milestone</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="hidden md:table-cell">Receiver</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myPayouts.map((row) => (
                <TableRow key={row.payout.id}>
                  <TableCell className="font-medium text-neutral-800">{row.milestoneTitle}</TableCell>
                  <TableCell className="font-mono text-xs text-neutral-500">{row.payout.batchId}</TableCell>
                  <TableCell className="hidden text-xs text-neutral-500 md:table-cell">{row.payout.receiver}</TableCell>
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

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="font-semibold text-neutral-900">Funded milestones</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Checkout captures against the exact agreed amount.</p>
        </div>
        {funded.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">
            No funded milestones yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Milestone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Order</TableHead>
                <TableHead className="hidden md:table-cell">Capture</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funded.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-neutral-800">{m.title}</TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold text-neutral-600">{m.status}</span>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-neutral-500 sm:table-cell">
                    {m.paypalOrderId ?? "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-neutral-500 md:table-cell">
                    {m.paypalCaptureId ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoney(m.amountCents, m.currency)}
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
