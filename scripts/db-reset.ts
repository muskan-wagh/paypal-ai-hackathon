/**
 * Reset + seed the demo database: `npm run db:reset`
 *
 * Deletes the SQLite file, applies the DDL, then seeds the full realistic
 * demo dataset (scripts/demo-data.ts): three demo clients + Dana the
 * freelancer, five projects and seven milestones spanning the whole
 * ProofPay workflow — funded, evaluated, paid, rejected, accepted and
 * pending-invitation. All demo records carry `is_demo = 1` and DEMO- PayPal
 * ids; no PayPal API call is ever made here.
 *
 * Demo logins (shown on the login page): maya@ / marcus@ / priya@ /
 * dana@proofpay.dev — password "demo1234"
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DDL, MIGRATIONS } from "../src/db/ddl";
import { seedDemoData } from "./demo-data";
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
for (const { table, column, ddl } of MIGRATIONS) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) sqlite.exec(ddl);
}
const db = drizzle(sqlite, { schema });

seedDemoData(db);

const pluckCount = (sql: string) => sqlite.prepare(sql).pluck().get() as number;
console.log(
  "db reset + demo seed complete:",
  JSON.stringify({
    users: pluckCount("SELECT COUNT(*) FROM users"),
    projects: pluckCount("SELECT COUNT(*) FROM projects"),
    milestones: pluckCount("SELECT COUNT(*) FROM milestones"),
    checklistItems: pluckCount("SELECT COUNT(*) FROM checklist_items"),
    submissions: pluckCount("SELECT COUNT(*) FROM submissions"),
    evaluations: pluckCount("SELECT COUNT(*) FROM evaluations"),
    payouts: pluckCount("SELECT COUNT(*) FROM payouts"),
    events: pluckCount("SELECT COUNT(*) FROM events"),
    demoMilestones: pluckCount("SELECT COUNT(*) FROM milestones WHERE is_demo = 1"),
  }),
);
sqlite.close();
