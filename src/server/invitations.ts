/**
 * Invitation lifecycle: create (CHECKLISTED → INVITED), accept (INVITED → ACCEPTED),
 * decline (INVITED → CHECKLISTED). Every step is ownership/role-checked here and
 * every state change goes through the server-side state machine.
 */
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { writeEvent } from "@/db/log";
import { invitations, milestones, users, type User } from "@/db/schema";
import { isValidEmail } from "@/lib/validate";
import { assertTransition } from "@/lib/state-machine";
import type { ServiceResult } from "@/server/projects";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function newInviteToken(): string {
  return randomBytes(24).toString("base64url"); // 32 chars, URL-safe, unguessable
}

export function createInvitation(input: {
  user: User;
  milestoneId: number;
  inviteeEmail: string;
  message?: string;
}): ServiceResult<{ token: string; invitationId: number }> {
  if (input.user.role !== "client") {
    return { ok: false, code: "FORBIDDEN", message: "Only clients can invite freelancers." };
  }
  if (!isValidEmail(input.inviteeEmail)) {
    return { ok: false, code: "BAD_EMAIL", message: "Enter a valid freelancer email." };
  }
  const email = input.inviteeEmail.trim().toLowerCase();
  if (email === input.user.email) {
    return { ok: false, code: "BAD_EMAIL", message: "Invite a freelancer — not yourself." };
  }
  const db = getDatabase();
  const milestone = db.select().from(milestones).where(eq(milestones.id, input.milestoneId)).get();
  if (!milestone) return { ok: false, code: "NOT_FOUND", message: "Milestone not found." };
  if (milestone.clientId !== input.user.id) {
    return { ok: false, code: "FORBIDDEN", message: "You don't own this milestone." };
  }
  // The invite needs an agreed checklist so the freelancer knows what they're graded on.
  if (milestone.status !== "CHECKLISTED" && milestone.status !== "INVITED") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: `Milestone must be CHECKLISTED to invite (currently ${milestone.status}).`,
    };
  }

  // The invited email must correspond to a registered freelancer account —
  // invitations land in the recipient's dashboard and are claimable only there.
  const invitee = db.select().from(users).where(eq(users.email, email)).get();
  if (!invitee || invitee.role !== "freelancer") {
    return {
      ok: false,
      code: "NO_ACCOUNT",
      message: "No freelancer account with that email yet — ask them to register first.",
    };
  }
  if (milestone.freelancerId && milestone.freelancerId !== invitee.id) {
    return {
      ok: false,
      code: "ALREADY_ASSIGNED",
      message: "Another freelancer is already assigned to this milestone.",
    };
  }

  const now = Date.now();
  const token = newInviteToken();
  const result = db
    .insert(invitations)
    .values({
      milestoneId: milestone.id,
      inviterId: input.user.id,
      inviteeEmail: email,
      token,
      status: "pending",
      message: input.message?.trim() || null,
      createdAt: now,
      expiresAt: now + INVITE_TTL_MS,
    })
    .run();

  if (milestone.status === "CHECKLISTED") {
    assertTransition(milestone.status, "INVITED");
    db.update(milestones)
      .set({ status: "INVITED", updatedAt: now })
      .where(eq(milestones.id, milestone.id))
      .run();
  }
  writeEvent(db, {
    milestoneId: milestone.id,
    type: "INVITED",
    actor: input.user.name,
    payload: { inviteeEmail: email, invitationId: Number(result.lastInsertRowid) },
  });
  return { ok: true, data: { token, invitationId: Number(result.lastInsertRowid) } };
}

export type InvitationPreview = {
  token: string;
  status: string;
  message: string | null;
  inviterName: string;
  inviteeEmail: string;
  expiresAt: number;
  milestone: {
    id: number;
    title: string;
    brief: string;
    amountCents: number;
    currency: string;
    deadline: string | null;
    status: string;
  };
};

export function viewInvitation(token: string): ServiceResult<InvitationPreview> {
  const db = getDatabase();
  const invite = db.select().from(invitations).where(eq(invitations.token, token)).get();
  if (!invite) return { ok: false, code: "NOT_FOUND", message: "Invitation not found." };
  const inviter = db.select().from(users).where(eq(users.id, invite.inviterId)).get();
  const milestone = db
    .select()
    .from(milestones)
    .where(eq(milestones.id, invite.milestoneId))
    .get();
  if (!milestone) return { ok: false, code: "NOT_FOUND", message: "Milestone not found." };
  const expired = invite.status === "pending" && invite.expiresAt < Date.now();
  return {
    ok: true,
    data: {
      token: invite.token,
      status: expired ? "expired" : invite.status,
      message: invite.message,
      inviterName: inviter?.name ?? "The client",
      inviteeEmail: invite.inviteeEmail,
      expiresAt: invite.expiresAt,
      milestone: {
        id: milestone.id,
        title: milestone.title,
        brief: milestone.brief,
        amountCents: milestone.amountCents,
        currency: milestone.currency,
        deadline: milestone.deadline,
        status: milestone.status,
      },
    },
  };
}

/** Accept: the invitee email must match the logged-in freelancer, token valid & pending. */
export function acceptInvitation(input: { user: User; token: string }): ServiceResult<{ milestoneId: number }> {
  if (input.user.role !== "freelancer") {
    return { ok: false, code: "FORBIDDEN", message: "Only freelancers can accept invitations." };
  }
  if (!input.user.email) {
    return { ok: false, code: "FORBIDDEN", message: "Your account has no email — log in again." };
  }
  const db = getDatabase();
  const invite = db.select().from(invitations).where(eq(invitations.token, input.token)).get();
  if (!invite) return { ok: false, code: "NOT_FOUND", message: "Invitation not found." };
  if (invite.status !== "pending") {
    return { ok: false, code: "ALREADY_HANDLED", message: `This invitation was already ${invite.status}.` };
  }
  if (invite.expiresAt < Date.now()) {
    db.update(invitations).set({ status: "expired" }).where(eq(invitations.id, invite.id)).run();
    return { ok: false, code: "EXPIRED", message: "This invitation has expired." };
  }
  if (invite.inviteeEmail !== input.user.email.toLowerCase()) {
    return {
      ok: false,
      code: "WRONG_USER",
      message: `This invitation was sent to ${invite.inviteeEmail}. Register or log in with that email.`,
    };
  }
  const milestone = db.select().from(milestones).where(eq(milestones.id, invite.milestoneId)).get();
  if (!milestone) return { ok: false, code: "NOT_FOUND", message: "Milestone not found." };
  if (milestone.status !== "INVITED") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: `Milestone is not waiting for an invite acceptance (currently ${milestone.status}).`,
    };
  }

  const now = Date.now();
  assertTransition(milestone.status, "ACCEPTED");
  db.update(milestones)
    .set({ status: "ACCEPTED", freelancerId: input.user.id, updatedAt: now })
    .where(eq(milestones.id, milestone.id))
    .run();
  db.update(invitations)
    .set({ status: "accepted", inviteeId: input.user.id, acceptedAt: now })
    // Any other pending invites for this milestone become moot once it's accepted.
    .where(eq(invitations.id, invite.id))
    .run();
  db.update(invitations)
    .set({ status: "expired" })
    .where(and(eq(invitations.milestoneId, milestone.id), eq(invitations.status, "pending")))
    .run();
  writeEvent(db, {
    milestoneId: milestone.id,
    type: "ACCEPTED",
    actor: input.user.name,
    payload: { invitationId: invite.id },
  });
  return { ok: true, data: { milestoneId: milestone.id } };
}

export function declineInvitation(input: { user: User; token: string }): ServiceResult<{ milestoneId: number }> {
  if (input.user.role !== "freelancer") {
    return { ok: false, code: "FORBIDDEN", message: "Only freelancers can decline invitations." };
  }
  if (!input.user.email) {
    return { ok: false, code: "FORBIDDEN", message: "Your account has no email — log in again." };
  }
  const db = getDatabase();
  const invite = db.select().from(invitations).where(eq(invitations.token, input.token)).get();
  if (!invite) return { ok: false, code: "NOT_FOUND", message: "Invitation not found." };
  if (invite.status !== "pending") {
    return { ok: false, code: "ALREADY_HANDLED", message: `This invitation was already ${invite.status}.` };
  }
  if (invite.inviteeEmail !== input.user.email.toLowerCase()) {
    return { ok: false, code: "WRONG_USER", message: "This invitation was sent to another freelancer." };
  }
  const now = Date.now();
  db.update(invitations).set({ status: "declined", declinedAt: now }).where(eq(invitations.id, invite.id)).run();
  const milestone = db.select().from(milestones).where(eq(milestones.id, invite.milestoneId)).get();
  if (milestone && milestone.status === "INVITED") {
    // Reopening the invite step: the client can invite someone else.
    assertTransition(milestone.status, "CHECKLISTED");
    db.update(milestones).set({ status: "CHECKLISTED", updatedAt: now }).where(eq(milestones.id, milestone.id)).run();
  }
  if (milestone) {
    writeEvent(db, {
      milestoneId: milestone.id,
      type: "DECLINED",
      actor: input.user.name,
      payload: { invitationId: invite.id },
    });
    return { ok: true, data: { milestoneId: milestone.id } };
  }
  return { ok: false, code: "NOT_FOUND", message: "Milestone not found." };
}

/** Invitations the freelancer received (history) or client sent. */
export function listInvitationsFor(user: User) {
  const db = getDatabase();
  if (user.role === "freelancer") {
    return db
      .select({
        token: invitations.token,
        status: invitations.status,
        message: invitations.message,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
        declinedAt: invitations.declinedAt,
        milestoneId: invitations.milestoneId,
        milestoneTitle: milestones.title,
        milestoneStatus: milestones.status,
        amountCents: milestones.amountCents,
        currency: milestones.currency,
      })
      .from(invitations)
      .innerJoin(milestones, eq(invitations.milestoneId, milestones.id))
      .where(eq(invitations.inviteeEmail, user.email!))
      .orderBy(desc(invitations.createdAt))
      .all();
  }
  return db
    .select({
      token: invitations.token,
      status: invitations.status,
      message: invitations.message,
      createdAt: invitations.createdAt,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      declinedAt: invitations.declinedAt,
      milestoneId: invitations.milestoneId,
      milestoneTitle: milestones.title,
      milestoneStatus: milestones.status,
      amountCents: milestones.amountCents,
      currency: milestones.currency,
    })
    .from(invitations)
    .innerJoin(milestones, eq(invitations.milestoneId, milestones.id))
    .where(eq(milestones.clientId, user.id))
    .orderBy(desc(invitations.createdAt))
    .all();
}
