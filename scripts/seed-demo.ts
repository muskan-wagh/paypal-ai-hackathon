/**
 * Reseed demo data in-place: `npm run db:reseed`
 *
 * Unlike `npm run db:reset` (which deletes the whole database file), this
 * wipes ONLY demo records — demo users (@proofpay.dev), their projects,
 * milestones and children, plus anything flagged `is_demo = 1` or carrying
 * `DEMO-` PayPal ids — then reseeds the demo dataset. Real registered
 * accounts and their live milestones are untouched, so you can refresh the
 * judge-facing demo without destroying anything you created in the app.
 *
 * No PayPal API calls are made; seeded payout rows are clearly-marked
 * samples (batch ids prefixed DEMO-).
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DDL, MIGRATIONS } from "../src/db/ddl";
import { seedDemoData, wipeDemoData } from "./demo-data";
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

fs.mkdirSync(DATA_DIR, { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
for (const statement of DDL) sqlite.exec(statement);
for (const { table, column, ddl } of MIGRATIONS) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) sqlite.exec(ddl);
}
const db = drizzle(sqlite, { schema });

wipeDemoData(db);
seedDemoData(db);

const pluckCount = (sql: string) => sqlite.prepare(sql).pluck().get() as number;
console.log(
  "demo data reseeded (demo records replaced, other accounts preserved):",
  JSON.stringify({
    users: pluckCount("SELECT COUNT(*) FROM users"),
    milestones: pluckCount("SELECT COUNT(*) FROM milestones"),
    demoMilestones: pluckCount("SELECT COUNT(*) FROM milestones WHERE is_demo = 1"),
  }),
);
sqlite.close();
