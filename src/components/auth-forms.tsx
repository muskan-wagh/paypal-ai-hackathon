"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Briefcase, Code2 } from "lucide-react";
import { loginWithPassword, registerUser, type AuthFormState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: AuthFormState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-10 w-full rounded-lg text-sm font-semibold shadow-[0_6px_16px_-6px_rgb(0_112_186/0.5)]"
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <Alert variant="destructive" className="rounded-lg">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

/** Email + password login. Demo accounts (seed) can be one-click filled. */
export function LoginForm({
  demoAccounts = [],
}: {
  demoAccounts?: Array<{ name: string; email: string; role: string }>;
}) {
  const [state, action] = useActionState(loginWithPassword, INITIAL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="space-y-4">
      <FormError error={state.error} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className="h-10"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className="h-10"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <SubmitButton label="Log in" pendingLabel="Checking credentials…" />
      {demoAccounts.length > 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-brand-wash p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Demo accounts — password demo1234
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("demo1234");
                }}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-brand hover:text-brand-navy"
              >
                Fill {account.name.split(" ")[0]} ({account.role})
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

const ROLE_OPTIONS = [
  {
    value: "client",
    icon: Briefcase,
    title: "I'm hiring",
    blurb: "Post projects, fund milestones in escrow, review AI evaluations, approve & pay out.",
  },
  {
    value: "freelancer",
    icon: Code2,
    title: "I'm working",
    blurb: "Accept invites, deliver work, get AI-evaluated proof, receive PayPal payouts.",
  },
] as const;

/** Registration with PayPal-style account-type selection (radio cards). */
export function RegisterForm() {
  const [state, action] = useActionState(registerUser, INITIAL);
  const [role, setRole] = useState<string>("");

  return (
    <form action={action} className="space-y-4">
      <FormError error={state.error} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-neutral-700">Account type</legend>
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => {
            const selected = role === option.value;
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                  selected
                    ? "border-brand bg-accent ring-2 ring-brand/20"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="role-choice"
                  className="sr-only"
                  checked={selected}
                  onChange={() => setRole(option.value)}
                />
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                      selected ? "bg-brand text-white" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 transition ${
                      selected ? "border-brand bg-brand" : "border-neutral-300 bg-white"
                    }`}
                    aria-hidden
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-brand-navy">{option.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{option.blurb}</p>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Alex Kim" autoComplete="name" required className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          className="h-10"
        />
      </div>
      <SubmitButton label="Create account" pendingLabel="Creating your account…" />
      <p className="text-center text-[11px] leading-relaxed text-neutral-400">
        Sandbox environment: payouts use the PayPal sandbox — every dollar is play money.
      </p>
    </form>
  );
}
