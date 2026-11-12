import type { Database } from "./index";
import { events } from "./schema";

export type Db = Database;

/** Append one event to the audit ledger (the UI timeline reads only from here). */
export async function writeEvent(
  db: Db,
  input: {
    milestoneId: number;
    type: string;
    actor: string;
    payload?: Record<string, unknown>;
  },
) {
  await db.insert(events)
    .values({
      milestoneId: input.milestoneId,
      type: input.type,
      actor: input.actor,
      payloadJson: JSON.stringify(input.payload ?? {}),
      createdAt: Date.now(),
    });
}
