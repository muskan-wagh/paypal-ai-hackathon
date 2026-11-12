/**
 * Seed only when the database is empty: `npm run db:seed-if-empty`
 *
 * Safe to run on every deploy: if the database already has users, nothing is
 * touched. Works against both a local file database and a remote one
 * (DATABASE_URL → Turso), so the first deployment boots with the full demo
 * workspace while later redeploys never wipe accounts or milestones created
 * since. For a guaranteed-fresh demo run `npm run db:reset` instead.
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
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

  const db = await getDatabase(); // applies DDL + migrations
  const [row] = await db.select({ c: sql<number>`count(*)` }).from(schema.users);
  const userCount = row?.c ?? 0;

  if (userCount > 0) {
    console.log(`db has ${userCount} users — skipping demo seed (use db:reset for a fresh demo)`);
  } else {
    await seedDemoData(db);
    console.log("empty db — demo workspace seeded");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
