/**
 * Reset + seed the demo database: `npm run db:reset`
 *
 * Local dev (no DATABASE_URL or file: URL): deletes the SQLite file, applies
 * the DDL, then seeds the full realistic demo dataset (scripts/demo-data.ts):
 * three demo clients + Dana the freelancer, five projects and seven
 * milestones spanning the whole ProofPay workflow — funded, evaluated, paid,
 * rejected, accepted and pending-invitation.
 *
 * Remote (libsql:// DATABASE_URL, e.g. Turso): drops all tables instead of
 * deleting files, then re-applies the DDL and reseeds. DESTRUCTIVE — every
 * account on the remote database is wiped.
 *
 * All demo records carry `is_demo = 1` and DEMO- PayPal ids; no PayPal API
 * call is ever made here. Demo logins (shown on the login page):
 * maya@ / marcus@ / priya@ / dana@proofpay.dev — password "demo1234"
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../src/db/index";
import * as schema from "../src/db/schema";
import { seedDemoData } from "./demo-data";

// Load .env manually (tsx doesn't auto-load it like Next.js does).
function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

async function main() {
  loadDotEnv();

  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";

  if (dbUrl.startsWith("file:") || !dbUrl) {
    // Local dev: recreate the SQLite file from scratch.
    const dbPath = dbUrl.startsWith("file:")
      ? dbUrl.slice("file:".length)
      : path.join(process.cwd(), ".data", "proofpay.db");
    for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(dbPath + suffix, { force: true });
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } else {
    // Remote (Turso): drop everything, DDL is re-applied by getDatabase() below.
    const client = createClient({ url: dbUrl, authToken: process.env.DATABASE_AUTH_TOKEN });
    const tables = [
      "evaluation_items",
      "evaluations",
      "files",
      "submissions",
      "checklist_items",
      "invitations",
      "payouts",
      "events",
      "milestones",
      "projects",
      "users",
    ];
    for (const table of tables) await client.execute(`DROP TABLE IF EXISTS ${table}`);
    await client.execute("DROP INDEX IF EXISTS idx_users_email");
    client.close();
  }

  const db = await getDatabase(); // applies DDL + migrations
  await seedDemoData(db);

  const countOf = async (
    table: typeof schema.users | typeof schema.projects | typeof schema.milestones | typeof schema.checklistItems | typeof schema.submissions | typeof schema.evaluations | typeof schema.payouts | typeof schema.events,
  ) => {
    const [row] = await db.select({ c: sql<number>`count(*)` }).from(table);
    return row?.c ?? 0;
  };

  console.log(
    "db reset + demo seed complete:",
    JSON.stringify({
      users: await countOf(schema.users),
      projects: await countOf(schema.projects),
      milestones: await countOf(schema.milestones),
      checklistItems: await countOf(schema.checklistItems),
      submissions: await countOf(schema.submissions),
      evaluations: await countOf(schema.evaluations),
      payouts: await countOf(schema.payouts),
      events: await countOf(schema.events),
      demoMilestones: (
        await db.select({ c: sql<number>`count(*)` }).from(schema.milestones).where(eq(schema.milestones.isDemo, 1))
      )[0]?.c ?? 0,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
