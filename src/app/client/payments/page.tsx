import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Banknote, ShieldCheck, Wallet } from "lucide-react";
import PageHeader from "@/components/page-header";
import StatTile from "@/components/stat-tile";
import { Stagger, StaggerItem, Reveal } from "@/components/motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDatabase } from "@/db";
import { milestones, payouts } from "@/db/schema";
import { formatMoney, formatTimestamp } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import StatusChip from "@/components/status-chip";
import type { MilestoneStatus } from "@/lib/state-machine";

export const dynamic = "force-dynamic";

export default async function ClientPaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");
  const db = await getDatabase();

  const myMilestones = await db.select().from(milestones).where(eq(milestones.clientId, user.id)).all();
  const myPayouts = await db
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
      <PageHeader
        eyebrow="Client workspace"
        title="Payments"
        description="PayPal sandbox funding, captures and payouts for your milestones."
      />

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <StatTile
            label="Committed"
            value={fundedTotal}
            currency="USD"
            sub="all funded milestones"
            icon={Wallet}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="In escrow"
            value={escrowRows.length}
            sub="captured, awaiting release"
            icon={ShieldCheck}
            tone="sky"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Paid out"
            value={paidTotal}
            currency="USD"
            sub="released to freelancers"
            icon={Banknote}
            tone="emerald"
          />
        </StaggerItem>
      </Stagger>

      <Reveal>
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="font-semibold tracking-tight text-neutral-900">Payout batches</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Sent via PayPal Payouts after your approval.
            </p>
          </div>
          {myPayouts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No payouts yet — approve a milestone, then send the payout from its page.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Milestone
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Batch
                  </TableHead>
                  <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-neutral-400 md:table-cell">
                    Receiver
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Amount
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Status
                  </TableHead>
                  <TableHead className="hidden pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:table-cell">
                    Sent
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPayouts.map((row) => (
                  <TableRow key={row.payout.id}>
                    <TableCell className="pl-5 font-medium text-neutral-800">
                      {row.milestoneTitle}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-neutral-500">
                      {row.payout.batchId}
                    </TableCell>
                    <TableCell className="hidden text-xs text-neutral-500 md:table-cell">
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

      <Reveal>
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="font-semibold tracking-tight text-neutral-900">Funded milestones</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Checkout captures against the exact agreed amount.
            </p>
          </div>
          {funded.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No funded milestones yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Milestone
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Status
                  </TableHead>
                  <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:table-cell">
                    Order
                  </TableHead>
                  <TableHead className="hidden text-[11px] font-semibold uppercase tracking-wider text-neutral-400 md:table-cell">
                    Capture
                  </TableHead>
                  <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funded.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-5 font-medium text-neutral-800">{m.title}</TableCell>
                    <TableCell>
                      <StatusChip status={m.status as MilestoneStatus} />
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-neutral-500 sm:table-cell">
                      {m.paypalOrderId ?? "—"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-neutral-500 md:table-cell">
                      {m.paypalCaptureId ?? "—"}
                    </TableCell>
                    <TableCell className="pr-5 text-right font-semibold tnum">
                      {formatMoney(m.amountCents, m.currency)}
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
