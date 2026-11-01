/**
 * Reset + seed the demo database: `npm run db:reset`
 * Maya (client) and Dana (freelancer), one DRAFT milestone and one FUNDED
 * milestone (with checklist + events) so the demo can start mid-flow.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { DDL } from "../src/db/ddl";
import { writeEvent } from "../src/db/log";
import * as schema from "../src/db/schema";

// Load .env manually (tsx doesn't auto-load it like Next.js does).
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "proofpay.db");

for (const suffix of ["", "-wal", "-shm"]) {
  fs.rmSync(DB_PATH + suffix, { force: true });
}
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
for (const statement of DDL) sqlite.exec(statement);
const db = drizzle(sqlite, { schema });

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

// Dana's payout email = the configured sandbox payout receiver when available.
const danaEmail =
  process.env.PAYPAL_PAYOUT_RECEIVER?.trim() || "dana@personal.example.com";

db.insert(schema.users)
  .values([
    { name: "Maya Chen", role: "client", sandboxEmail: null, createdAt: now },
    { name: "Dana Rivera", role: "freelancer", sandboxEmail: danaEmail, createdAt: now },
  ])
  .run();

const client = db.select().from(schema.users).where(eq(schema.users.name, "Maya Chen")).get();
const freelancer = db.select().from(schema.users).where(eq(schema.users.name, "Dana Rivera")).get();
if (!client || !freelancer) throw new Error("seed: users missing");

const draft = db
  .insert(schema.milestones)
  .values({
    clientId: client.id,
    freelancerId: freelancer.id,
    title: "Landing page hero redesign",
    brief:
      "Refresh the marketing site hero: new headline treatment, one supporting illustration, " +
      "and a primary CTA. Keep the existing nav. Deliver source files plus web exports.",
    amountCents: 25000,
    currency: "USD",
    deadline: new Date(now + 7 * day).toISOString().slice(0, 10),
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
  })
  .returning()
  .get();
writeEvent(db, {
  milestoneId: draft.id,
  type: "DRAFT_CREATED",
  actor: "Maya Chen",
  payload: { amountCents: draft.amountCents },
});

const funded = db
  .insert(schema.milestones)
  .values({
    clientId: client.id,
    freelancerId: freelancer.id,
    title: "Login screen with validation",
    brief:
      "Build the app login screen: email + password form, client-side validation, error " +
      "states, and a 'forgot password' link that goes to the reset page.",
    amountCents: 20000,
    currency: "USD",
    deadline: new Date(now + 10 * day).toISOString().slice(0, 10),
    status: "FUNDED",
    paypalOrderId: "DEMO-ORDER-SEED01",
    paypalCaptureId: "DEMO-CAPTURE-SEED01",
    createdAt: now - day,
    updatedAt: now - 3 * 60 * 60 * 1000,
  })
  .returning()
  .get();

writeEvent(db, {
  milestoneId: funded.id,
  type: "DRAFT_CREATED",
  actor: "Maya Chen",
  payload: { amountCents: funded.amountCents },
});
writeEvent(db, {
  milestoneId: funded.id,
  type: "CHECKLIST_CREATED",
  actor: "ai",
  payload: { model: process.env.AI_MODEL ?? "seed-demo", items: 4 },
});

const checklist = [
  {
    title: "Email + password form delivered",
    acceptanceCriteria: "Screenshot shows a login form with email and password fields and a submit button.",
    checkType: "visual",
  },
  {
    title: "Client-side validation working",
    acceptanceCriteria: "Invalid email or short password shows clear inline error messages.",
    checkType: "visual",
  },
  {
    title: "Forgot-password link present",
    acceptanceCriteria: "A 'forgot password' link routes to the reset page.",
    checkType: "scope",
  },
  {
    title: "Design matches style guide",
    acceptanceCriteria: "Colors and typography match the provided brand style guide.",
    checkType: "quality",
  },
] as const;

checklist.forEach((item, index) => {
  db.insert(schema.checklistItems)
    .values({
      milestoneId: funded.id,
      title: item.title,
      acceptanceCriteria: item.acceptanceCriteria,
      checkType: item.checkType,
      sortOrder: index,
      createdAt: now - day,
    })
    .run();
});

writeEvent(db, {
  milestoneId: funded.id,
  type: "FUNDED",
  actor: "Maya Chen",
  payload: { amountCents: funded.amountCents, demoOrderId: "DEMO-ORDER-SEED01" },
});

const pluckCount = (sql: string) => sqlite.prepare(sql).pluck().get() as number;
console.log(
  "db reset complete:",
  JSON.stringify({
    users: pluckCount("SELECT COUNT(*) FROM users"),
    milestones: pluckCount("SELECT COUNT(*) FROM milestones"),
    checklistItems: pluckCount("SELECT COUNT(*) FROM checklist_items"),
    events: pluckCount("SELECT COUNT(*) FROM events"),
  }),
);
sqlite.close();
