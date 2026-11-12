import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { DDL, MIGRATIONS } from "./ddl";
import * as schema from "./schema";

/**
 * Serverless-friendly database access via libSQL.
 *
 * - Production (Vercel): DATABASE_URL = libsql://… pointing at Turso, plus
 *   DATABASE_AUTH_TOKEN. Reads/writes go over HTTPS to the hosted database.
 * - Local dev: DATABASE_URL unset → falls back to the same local SQLite file
 *   as before (.data/proofpay.db), so existing workflows keep working.
 *
 * DDL runs with IF NOT EXISTS on first use per cold start — no migration
 * tooling needed. `applyMigrations` handles databases created before plan2
 * in place (idempotent ALTER TABLE guarded by a PRAGMA check).
 */

export type Database = LibSQLDatabase<typeof schema>;

const LOCAL_DB_PATH = path.join(process.cwd(), ".data", "proofpay.db");

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  return url && url.length > 0 ? url : `file:${LOCAL_DB_PATH}`;
}

/** Apply in-place column migrations for databases created before plan2. */
async function applyMigrations(client: Client) {
  for (const { table, column, ddl } of MIGRATIONS) {
    const result = await client.execute(`PRAGMA table_info(${table})`);
    const cols = result.rows as unknown as Array<{ name: string }>;
    if (!cols.some((c) => c.name === column)) await client.execute(ddl);
  }
}

let dbPromise: Promise<Database> | null = null;

async function initDatabase(): Promise<Database> {
  const url = databaseUrl();
  const isLocal = url.startsWith("file:");
  if (isLocal) fs.mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  const client = createClient({
    url,
    authToken: isLocal ? undefined : process.env.DATABASE_AUTH_TOKEN,
  });
  for (const statement of DDL) await client.execute(statement);
  await applyMigrations(client);
  if (isLocal) await client.execute("PRAGMA journal_mode = WAL");
  return drizzle(client, { schema });
}

export function getDatabase(): Promise<Database> {
  if (!dbPromise) dbPromise = initDatabase();
  return dbPromise;
}

export { schema };
