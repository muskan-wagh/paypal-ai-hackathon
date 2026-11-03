import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile-form";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FreelancerSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "freelancer") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Your ProofPay identity and payout destination.</p>
      </div>
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-900">Profile</h2>
        <div className="mt-4">
          <ProfileForm
            name={user.name}
            email={user.email}
            role={user.role}
            sandboxEmail={user.sandboxEmail}
          />
        </div>
      </section>
      <section className="rounded-xl border border-neutral-200 bg-white p-6 text-sm shadow-sm">
        <h2 className="font-semibold text-neutral-900">Payouts</h2>
        <p className="mt-1.5 text-neutral-600">
          When a client approves your work and releases funds, PayPal Payouts sends the milestone
          amount to the sandbox email above. You can track every batch in Earnings.
        </p>
      </section>
    </div>
  );
}
