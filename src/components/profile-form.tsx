"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfileAction, type ProfileFormState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="rounded-lg font-semibold">
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export default function ProfileForm({
  name,
  email,
  role,
  sandboxEmail,
}: {
  name: string;
  email: string | null;
  role: string;
  sandboxEmail: string | null;
}) {
  const [state, action] = useActionState(updateProfileAction, {} as ProfileFormState);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" defaultValue={name} required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Login email</Label>
          <Input id="email" name="email" type="email" defaultValue={email ?? ""} required />
        </div>
      </div>

      {role === "freelancer" && (
        <div className="space-y-2">
          <Label htmlFor="sandboxEmail">PayPal sandbox payout email</Label>
          <Input id="sandboxEmail" name="sandboxEmail" type="email" defaultValue={sandboxEmail ?? ""} />
          <p className="text-xs text-neutral-500">
            Where payouts land after the client releases them. Must be a US personal sandbox account
            for the demo — payments are play money.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">Role: {role} (locked — screenshots are role-based)</p>
        <Submit />
      </div>
    </form>
  );
}
