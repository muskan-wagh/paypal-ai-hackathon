/**
 * SQLite DDL mirroring src/db/schema.ts. Executed with IF NOT EXISTS on open —
 * no migration tooling needed, works on a fresh deploy (Render included).
 * `npm run db:reset` deletes the db file and lets this run before seeding.
 *
 * Existing databases created before plan2 (project/invite expansion) are migrated
 * in place via MIGRATIONS (idempotent ALTER TABLE guarded by a PRAGMA check).
 */
export const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT,
    password_hash TEXT,
    sandbox_email TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    freelancer_id INTEGER REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    title TEXT NOT NULL,
    brief TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    is_demo INTEGER NOT NULL DEFAULT 0,
    paypal_order_id TEXT,
    paypal_capture_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id),
    inviter_id INTEGER NOT NULL REFERENCES users(id),
    invitee_email TEXT NOT NULL,
    invitee_id INTEGER REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    accepted_at INTEGER,
    declined_at INTEGER
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
  // Partial unique index: duplicates impossible for real logins, NULLs allowed for legacy rows.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`,
];

/**
 * In-place column migrations for databases created before plan2. Applied after
 * DDL in src/db/index.ts — each only runs when PRAGMA confirms the column is
 * missing, so it is safe to execute on every cold start.
 */
export const MIGRATIONS: Array<{ table: string; column: string; ddl: string }> = [
  { table: "users", column: "email", ddl: "ALTER TABLE users ADD COLUMN email TEXT" },
  { table: "users", column: "password_hash", ddl: "ALTER TABLE users ADD COLUMN password_hash TEXT" },
  {
    table: "milestones",
    column: "project_id",
    ddl: "ALTER TABLE milestones ADD COLUMN project_id INTEGER REFERENCES projects(id)",
  },
  {
    table: "milestones",
    column: "is_demo",
    ddl: "ALTER TABLE milestones ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0",
  },
];
