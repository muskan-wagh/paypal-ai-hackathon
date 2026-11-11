/**
 * Seed only when the database is empty: `npm run db:seed-if-empty`
 *
 * Used in the Render build command (render.yaml) so the first deployment
 * boots with the full demo workspace, while later redeploys never wipe
 * accounts or milestones created since. For a guaranteed-fresh demo run
 * `npm run db:reset` instead (Render shell: `cd /opt/render/project/src && npm run db:reset`).
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

fs.mkdirSync(DATA_DIR, { recursive: true });
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
for (const statement of DDL) sqlite.exec(statement);
for (const { table, column, ddl } of MIGRATIONS) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) sqlite.exec(ddl);
}
const db = drizzle(sqlite, { schema });

const userCount = (sqlite.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
if (userCount > 0) {
  console.log(`db has ${userCount} users — skipping demo seed (use db:reset for a fresh demo)`);
} else {
  seedDemoData(db);
  console.log("empty db — demo workspace seeded");
}
sqlite.close();
