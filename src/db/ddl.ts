/**
 * SQLite DDL mirroring src/db/schema.ts. Executed with IF NOT EXISTS on open —
 * no migration tooling needed, works on a fresh deploy (Render included).
 * `npm run db:reset` deletes the db file and lets this run before seeding.
 */
export const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    sandbox_email TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    freelancer_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    brief TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    paypal_order_id TEXT,
    paypal_capture_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id),
    title TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    check_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id),
    freelancer_id INTEGER NOT NULL REFERENCES users(id),
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL REFERENCES submissions(id),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id),
    submission_id INTEGER NOT NULL REFERENCES submissions(id),
    verdict TEXT NOT NULL,
    score INTEGER NOT NULL,
    summary TEXT NOT NULL,
    model TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS evaluation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL REFERENCES evaluations(id),
    checklist_item_id INTEGER NOT NULL REFERENCES checklist_items(id),
    verdict TEXT NOT NULL,
    explanation TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id),
    batch_id TEXT NOT NULL,
    status TEXT NOT NULL,
    receiver TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    raw_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id),
    type TEXT NOT NULL,
    actor TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  )`,
];
