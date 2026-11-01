import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { DDL } from "./ddl";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "proofpay.db");

let db: BetterSQLite3Database<typeof schema> | null = null;

export function getDatabase() {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    for (const statement of DDL) sqlite.exec(statement);
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
