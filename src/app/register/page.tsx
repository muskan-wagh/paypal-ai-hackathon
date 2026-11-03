import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import AuthShell from "@/components/auth-shell";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <AuthShell
      heading="Create your account"
      subheading="Choose how you'll use ProofPay — hire talent or get paid for work."
    >
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
