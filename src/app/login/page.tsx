import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, like } from "drizzle-orm";
import { LoginForm } from "@/components/auth-forms";
import AuthShell from "@/components/auth-shell";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");
  const demoAccounts = await (await getDatabase()).select({ name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(like(users.email, "%@proofpay.dev"))
    .orderBy(asc(users.role))
    .all();

  return (
    <AuthShell heading="Log in to ProofPay" subheading="Use your email and password.">
      <LoginForm
        demoAccounts={demoAccounts
          .filter((a) => a.email !== null)
          .map((a) => ({ name: a.name, email: a.email as string, role: a.role }))}
      />
      <p className="mt-4 text-center text-sm text-neutral-500">
        No account?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Sign up free
        </Link>
      </p>
    </AuthShell>
  );
}
