import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema";
import { events } from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

/** Append one event to the audit ledger (the UI timeline reads only from here). */
export function writeEvent(
  db: Db,
  input: {
    milestoneId: number;
    type: string;
    actor: string;
    payload?: Record<string, unknown>;
  },
) {
  db.insert(events)
    .values({
      milestoneId: input.milestoneId,
      type: input.type,
      actor: input.actor,
      payloadJson: JSON.stringify(input.payload ?? {}),
      createdAt: Date.now(),
    })
    .run();
}
