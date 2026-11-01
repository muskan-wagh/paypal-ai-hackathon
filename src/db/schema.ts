import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Personas only — no real auth. A "user" is either the client or the freelancer. */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'client' | 'freelancer'
  sandboxEmail: text("sandbox_email"), // PayPal sandbox account (receives payouts)
  createdAt: integer("created_at").notNull(),
});

export const milestones = sqliteTable("milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => users.id),
  freelancerId: integer("freelancer_id").references(() => users.id),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  deadline: text("deadline"), // ISO date
  /** State machine — see src/lib/state-machine.ts (enforced server-side only). */
  status: text("status").notNull().default("DRAFT"),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
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
  /** e.g. CHECKLIST_CREATED | FUNDED | SUBMITTED | EVALUATED | APPROVED | PAID */
  type: text("type").notNull(),
  actor: text("actor").notNull(), // user name, 'system' or 'ai'
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

export type User = typeof users.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type EvaluationItem = typeof evaluationItems.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type EventRow = typeof events.$inferSelect;
