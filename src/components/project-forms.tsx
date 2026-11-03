"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createMilestoneAction, createProjectAction, type FormState } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="rounded-lg font-semibold">
      {pending ? pendingLabel : label}
    </Button>
  );
}

const INITIAL: FormState = {};

export function NewProjectForm() {
  const [state, action] = useActionState(createProjectAction, INITIAL);
  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="title">Project title</Label>
        <Input id="title" name="title" placeholder="Brand & marketing site" required minLength={3} />
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
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-2">
        <Label htmlFor="title">Milestone title</Label>
        <Input id="title" name="title" placeholder="Landing page hero redesign" required minLength={3} />
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
        <p className="text-xs text-neutral-500">
          This brief becomes the AI acceptance checklist the freelancer will be graded on — be
          specific.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input id="amount" name="amount" inputMode="decimal" placeholder="250.00" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline (optional)</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>
      <Submit label="Create milestone" pendingLabel="Creating…" />
    </form>
  );
}
