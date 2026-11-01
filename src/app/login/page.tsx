import { redirect } from "next/navigation";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { loginAs } from "@/app/actions/auth";
import AppHeader from "@/components/app-header";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser) redirect("/milestones");
  const allUsers = getDatabase().select().from(users).all();

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader user={null} />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold">Choose a persona</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Demo login — no passwords. The client and the freelancer see different controls;
          role checks are enforced server-side.
        </p>
        <div className="mt-6 space-y-3">
          {allUsers.map((user) => (
            <form action={loginAs} key={user.id}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="w-full rounded-lg border border-neutral-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{user.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === "client"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {user.role === "client"
                    ? "Creates briefs, funds milestones, approves work, pays out"
                    : "Delivers work, submits proof, receives PayPal payouts"}
                </p>
              </button>
            </form>
          ))}
        </div>
        <p className="mt-6 text-xs text-neutral-400">
          Sandbox environment — every payment is PayPal sandbox play-money.
        </p>
      </main>
    </div>
  );
}
