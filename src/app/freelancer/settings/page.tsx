import { redirect } from "next/navigation";
import PageHeader from "@/components/page-header";
import ProfileForm from "@/components/profile-form";
import { Reveal } from "@/components/motion";
import { Wallet } from "lucide-react";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FreelancerSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "freelancer") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Freelancer workspace"
        title="Settings"
        description="Your ProofPay identity and payout destination."
      />
      <Reveal>
        <section className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold tracking-tight text-neutral-900">Profile</h2>
          <div className="mt-4">
            <ProfileForm
              name={user.name}
              email={user.email}
              role={user.role}
              sandboxEmail={user.sandboxEmail}
            />
          </div>
        </section>
      </Reveal>
      <Reveal delay={0.1}>
        <section className="card-surface rounded-2xl p-6 text-sm">
          <h2 className="font-semibold tracking-tight text-neutral-900">Payouts</h2>
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-brand-wash p-4">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p className="text-xs leading-relaxed text-neutral-600">
              When a client approves your work and releases funds, PayPal Payouts sends the milestone
              amount to the sandbox email above. You can track every batch in Earnings.
            </p>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
