# ProofPay

**AI-gated milestone payouts for freelancers** — built for the PayPal AI Hackathon 2026.

> A client funds a milestone via PayPal → AI generates an acceptance checklist from the
> task brief → the freelancer submits proof → AI evaluates it against the checklist →
> the client gives the final human approval → PayPal Payouts sends the money to the
> freelancer.

PayPal is the money rail (order approval → capture → payout) and the AI is load-bearing
(checklist generation + proof evaluation), but **AI never moves money** — a human always
stands between an AI verdict and a payout. Every state transition is written to an
append-only audit ledger that drives the on-screen timeline.

## The problem

Freelancers and clients disagree about "done" — scope creep, vague briefs, and
subjective acceptance waste time and money. ProofPay replaces "trust me" with a
machine-checkable acceptance checklist generated from the brief itself, then lets an AI
judge the delivered proof against that checklist before a human releases escrow.

## Run in < 5 minutes

```bash
# 1. Node 22+ (required by @openrouter/ai-sdk-provider)
nvm install 22 && nvm use 22

# 2. Install
npm install

# 3. Configure (copy and fill in the values — see comments in the file)
cp .env.example .env

# 4. Seed the demo database (full demo workspace: 3 clients + freelancer, 5 projects,
#    7 milestones spanning the whole workflow — see DEMO.md "Demo data & walkthrough")
npm run db:reset

# Re-seed only demo records later (preserves real registered accounts):
npm run db:reseed
# (restart `npm run dev` afterwards so the server reopens the fresh DB file)

# Deployments (Vercel): set DATABASE_URL/DATABASE_AUTH_TOKEN (Turso) + the
# variables above in the Vercel dashboard, then run `npm run db:seed-if-empty`
# against the remote DB once — later redeploys never wipe created accounts.

# 5. Run
npm run dev
# → http://localhost:3000  (log in: maya@ / dana@proofpay.dev — password demo1234)
```

Environment values (all from free accounts):

| Variable | Where to get it |
|---|---|
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | developer.paypal.com → Apps & Credentials → **Sandbox** tab |
| `PAYPAL_PAYOUT_RECEIVER` | Sandbox personal account email (`sb-…@personal.example.com`) |
| `OPENROUTER_API_KEY` | openrouter.ai/keys |
| `AI_MODEL` | Pinned free vision model (see Tools statement below) |
| `AI_FALLBACKS` | Comma-separated fallback model ids |
| `SESSION_SECRET` | Any long random string (`openssl rand -hex 32`) |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | Turso (libSQL) — prod only; leave unset for local dev (uses `.data/proofpay.db`) |

**Important — sandbox country restriction:** sandbox accounts created in some countries
(e.g. India) cannot send payouts or process checkout. Create **US-country** sandbox
accounts (Testing Tools → Sandbox Accounts → Create Account → Country: United States)
and attach your app to the US business account.

## Architecture

```
Client (browser) → Next.js (server) → OpenRouter (AI) + PayPal (sandbox)
```

**State machine** (enforced server-side only):

```
DRAFT → CHECKLISTED → INVITED → ACCEPTED → FUNDED → SUBMITTED → EVALUATED → APPROVED → PAID
                                            ↘ REJECTED → SUBMITTED (resubmit)
```

**Database**: SQLite (via libSQL/Turso in production) + Drizzle ORM. All file bytes (≤ 5 MB)
stored as BLOBs in the DB — no external storage needed. `events` table is the append-only
audit ledger that drives the on-screen timeline.

**Auth**: real registration with bcrypt password hashing, wrapped in an HttpOnly
HMAC-signed cookie `{userId, exp}`. Role checks enforced on every server route;
demo logins seeded on `db:reset` (maya@ / dana@proofpay.dev, password `demo1234`). Seeded
demo milestones carry `is_demo = 1` and `DEMO-` PayPal ids; funding/payout endpoints
refuse demo records, so sample data can never trigger a real PayPal call.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | SQLite + Drizzle ORM + @libsql/client (Turso in prod) |
| AI | Vercel AI SDK v7 + OpenRouter (`@openrouter/ai-sdk-provider` v3) |
| PayPal | `@paypal/react-paypal-js` v10 (JS SDK v6) + direct REST for Payouts |
| Hosting | Vercel + Turso (hosted libSQL) |
| License | MIT |

## Tools statement (for Devpost submission)

- **PayPal products used**: Orders API v2 (create + capture), Payments (capture), Payouts API v1
  (batch create + poll), sandbox negative testing (`PayPal-Mock-Response`), Transaction Search
  (history only — not used for instant UI)
- **AI model**: OpenRouter — primary `nvidia/nemotron-3.5-super-vl:free` (vision-capable,
  structured output via `response_format`), fallbacks `google/gemma-4-31b-it:free`,
  `google/gemma-4-26b-a4b-it:free`
- **AI usage**: (1) checklist generation — `generateObject` + Zod `ChecklistSchema` → 4–8
  items `{title, acceptanceCriteria, checkType}`; (2) proof evaluation — `generateObject` +
  Zod `EvaluationSchema` → per-item `pass|partial|fail` + explanation, score 0–100, summary.
  Images passed directly to the vision model; PDFs extracted to text server-side.
  Structured outputs validated by Zod; malformed JSON repaired by OpenRouter's Response
  Healing plugin.
- **Other tools**: Next.js 15, Tailwind CSS v4, Drizzle ORM, better-sqlite3, Zod v4,
  TypeScript 5, Render

## Guardrails

- **AI never moves money.** The AI generates checklists and evaluates proof. It has no
  PayPal credentials, no tools, and no ability to call PayPal APIs. Every money-moving
  action (fund, capture, payout) requires an explicit human click from the client.
- **Human approval gate.** State machine: `EVALUATED → APPROVED` (client approves) →
  `PAID` (client sends payout). The AI's verdict is advisory.
- **Audit trail.** Every state transition writes an immutable row to the `events` table
  (type, actor, payload, timestamp). The on-screen timeline reads only from this ledger.
- **Amount integrity.** Before capture, the server fetches the PayPal order and verifies
  its amount/currency matches the milestone — a $2 order cannot be captured against a
  $250 milestone.
- **Access control.** Freelancer cannot reach approve/fund/payout endpoints; client cannot
  submit proof. Enforced server-side on every route.
- **AI failure containment.** If the AI fails (rate limit, timeout, parse error), the
  milestone stays in its current state. No auto-approval, no auto-payout. Retry button
  provided.
- **Sandbox only.** All PayPal calls go to `api-m.sandbox.paypal.com`. No real money.

## Demo walkthrough

See `DEMO.md` for the scripted walkthrough and test credentials.

## Deployment

Hosting is **Vercel + Turso** (both free tiers):

1. Create a Turso database (`turso db create proofpay`) and grab its URL + auth token
   (`turso db show proofpay --url`, `turso db tokens create proofpay`).
2. In the Vercel project, set env vars: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`,
   `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PAYOUT_RECEIVER`,
   `OPENROUTER_API_KEY`, `AI_MODEL`, `AI_FALLBACKS`, `SESSION_SECRET`
   (never commit secrets).
3. Seed the demo workspace once against the remote DB:
   `DATABASE_URL=… DATABASE_AUTH_TOKEN=… npm run db:seed-if-empty`
   (or `db:reset` for a guaranteed-fresh demo; it drops all tables on a remote DB).
4. Push to GitHub — Vercel auto-deploys on every commit.

`render.yaml` remains as an alternative Render deployment target (persistent disk).

## License

MIT — see `LICENSE`.