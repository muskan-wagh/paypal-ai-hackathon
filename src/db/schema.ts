import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Real registration-based auth (bcrypt hashes) on top of the HMAC cookie session.
 * `sandbox_email` is the PayPal sandbox account that receives payouts — distinct
 * from the app login `email`.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'client' | 'freelancer'
  email: text("email"), // login email (unique — partial unique index, see ddl.ts)
  passwordHash: text("password_hash"),
  sandboxEmail: text("sandbox_email"), // PayPal sandbox account (receives payouts)
  createdAt: integer("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const milestones = sqliteTable("milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => users.id),
  freelancerId: integer("freelancer_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  deadline: text("deadline"), // ISO date
  /** State machine — see src/lib/state-machine.ts (enforced server-side only). */
  status: text("status").notNull().default("DRAFT"),
  /** 1 = seeded demo/sample record — never eligible for real PayPal calls. */
  isDemo: integer("is_demo").notNull().default(0),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** Per-milestone invite link (crypto-random token). Freelancer accepts → milestone. */
export const invitations = sqliteTable("invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id),
  inviterId: integer("inviter_id")
    .notNull()
    .references(() => users.id),
  inviteeEmail: text("invitee_email").notNull(), // lowercased
  inviteeId: integer("invitee_id").references(() => users.id), // set on accept
  token: text("token").notNull().unique(), // crypto-random, URL-safe
  status: text("status").notNull().default("pending"), // pending | accepted | declined | expired
  message: text("message"),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  acceptedAt: integer("accepted_at"),
  declinedAt: integer("declined_at"),
});

export const checklistItems = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id),
  title: text("title").notNull(),
  acceptanceCriteria: text("acceptance_criteria").notNull(),
  /** 'visual' | 'document' | 'scope' | 'quality' */
  checkType: text("check_type").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id),
  freelancerId: integer("freelancer_id")
    .notNull()
    .references(() => users.id),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

/** File bytes live in the DB (≤ 5 MB each) so the demo needs no external storage. */
export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id")
    .notNull()
    .references(() => submissions.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  data: blob("data").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const evaluations = sqliteTable("evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id),
  submissionId: integer("submission_id")
    .notNull()
    .references(() => submissions.id),
  /** 'pass' | 'partial' | 'fail' */
  verdict: text("verdict").notNull(),
  score: integer("score").notNull(), // 0–100
  summary: text("summary").notNull(),
  model: text("model").notNull(), // OpenRouter model id that produced the evaluation
  rawJson: text("raw_json").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const evaluationItems = sqliteTable("evaluation_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  evaluationId: integer("evaluation_id")
    .notNull()
    .references(() => evaluations.id),
  checklistItemId: integer("checklist_item_id")
    .notNull()
    .references(() => checklistItems.id),
  /** 'pass' | 'partial' | 'fail' | 'unverifiable' */
  verdict: text("verdict").notNull(),
  explanation: text("explanation").notNull(),
});

export const payouts = sqliteTable("payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id),
  batchId: text("batch_id").notNull(),
  status: text("status").notNull(),
  receiver: text("receiver").notNull(),
  amountCents: integer("amount_cents").notNull(),
  rawJson: text("raw_json").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** Append-only audit ledger — the source of truth for the UI timeline. */
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  milestoneId: integer("milestone_id")
    .notNull()
    .references(() => milestones.id),
  /** e.g. DRAFT_CREATED | CHECKLIST_CREATED | INVITED | ACCEPTED | FUNDED … */
  type: text("type").notNull(),
  actor: text("actor").notNull(), // user name, 'system' or 'ai'
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type EvaluationItem = typeof evaluationItems.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type EventRow = typeof events.$inferSelect;
