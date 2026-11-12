/**
 * Reseed demo data in-place: `npm run db:reseed`
 *
 * Unlike `npm run db:reset` (which wipes the whole database), this deletes
 * ONLY demo records — demo users (@proofpay.dev), their projects, milestones
 * and children, plus anything flagged `is_demo = 1` or carrying `DEMO-`
 * PayPal ids — then reseeds the demo dataset. Real registered accounts and
 * their live milestones are untouched, so you can refresh the judge-facing
 * demo without destroying anything created in the app. Works against both a
 * local file database and a remote one (DATABASE_URL → Turso).
 *
 * No PayPal API calls are made; seeded payout rows are clearly-marked
 * samples (batch ids prefixed DEMO-).
 */
import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../src/db/index";
import * as schema from "../src/db/schema";
import { seedDemoData, wipeDemoData } from "./demo-data";

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
  await wipeDemoData(db);
  await seedDemoData(db);

  const countOf = async (table: typeof schema.users | typeof schema.milestones) => {
    const [row] = await db.select({ c: sql<number>`count(*)` }).from(table);
    return row?.c ?? 0;
  };

  console.log(
    "demo data reseeded (demo records replaced, other accounts preserved):",
    JSON.stringify({
      users: await countOf(schema.users),
      milestones: await countOf(schema.milestones),
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
