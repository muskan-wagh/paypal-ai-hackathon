"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { createMilestoneAction, createProjectAction, type FormState } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg text-sm font-semibold shadow-[0_6px_16px_-6px_rgb(0_112_186/0.5)]"
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  );
}

const INITIAL: FormState = {};

export function NewProjectForm() {
  const [state, action] = useActionState(createProjectAction, INITIAL);
  return (
    <form action={action} className="space-y-4">
      <FormError error={state.error} />
      <div className="space-y-2">
        <Label htmlFor="title">Project title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Brand & marketing site"
          required
          minLength={3}
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What this engagement covers overall — milestones will carry the detail."
        />
      </div>
      <Submit label="Create project" pendingLabel="Creating…" />
    </form>
  );
}

export function NewMilestoneForm({ projectId }: { projectId: number }) {
  const [state, action] = useActionState(createMilestoneAction, INITIAL);
  return (
    <form action={action} className="space-y-4">
      <FormError error={state.error} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-2">
        <Label htmlFor="title">Milestone title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Landing page hero redesign"
          required
          minLength={3}
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brief">Work brief (what does “done” look like?)</Label>
        <Textarea
          id="brief"
          name="brief"
          rows={5}
          required
          minLength={20}
          placeholder="Describe the deliverables, constraints and anything the AI checklist should test. The AI builds acceptance criteria from this."
        />
        <p className="flex items-start gap-1.5 text-xs text-neutral-500">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
          This brief becomes the AI acceptance checklist the freelancer will be graded on — be
          specific.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="250.00"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline (optional)</Label>
          <Input id="deadline" name="deadline" type="date" className="h-10" />
        </div>
      </div>
      <Submit label="Create milestone" pendingLabel="Creating…" />
    </form>
  );
}
