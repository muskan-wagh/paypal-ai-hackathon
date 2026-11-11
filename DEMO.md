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

# 4. Seed the demo database (full demo workspace: 3 clients + Dana the freelancer,
#    5 projects, 7 milestones across the whole workflow — see "Demo data" below)
npm run db:reset

# 5. Run
npm run dev
# → http://localhost:3000  (log in: maya@/marcus@/priya@/dana@proofpay.dev — password demo1234)
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

**Important — sandbox country restriction:** sandbox accounts created in some countries
(e.g. India) cannot send payouts or process checkout. Create **US-country** sandbox
accounts (Testing Tools → Sandbox Accounts → Create Account → Country: United States)
and attach your app to the US business account. See `plan.md` Phase 2 for the full
diagnosis.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client     │────▶│  Next.js     │────▶│  OpenRouter  │     │  PayPal      │
│  (browser)  │     │  (server)    │     │  (AI)        │     │  (sandbox)   │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │  1. create brief   │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │  2. generateObject │                    │
       │                    │───────────────────▶│                    │
       │                    │◀───────────────────│                    │
       │  3. checklist UI   │                    │                    │
       │◀───────────────────│                    │                    │
       │                    │  4. fund (order)   │                    │
       │───────────────────▶│──────────────────────────────────────────▶│
       │                    │◀──────────────────────────────────────────│
       │  5. popup approve  │                    │                    │
       │──────────────────────────────────────────────────────────────▶│
       │                    │  6. capture        │                    │
       │                    │──────────────────────────────────────────▶│
       │                    │◀──────────────────────────────────────────│
       │  7. freelancer submits proof (images/PDF)                     │
       │───────────────────▶│                    │                    │
       │                    │  8. generateObject │                    │
       │                    │───────────────────▶│                    │
       │                    │◀───────────────────│                    │
       │  9. verdict UI     │                    │                    │
       │◀───────────────────│                    │                    │
       │ 10. human approve  │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │ 11. payout         │                    │
       │                    │──────────────────────────────────────────▶│
       │                    │◀──────────────────────────────────────────│
```

**State machine** (enforced server-side only):

```
DRAFT → CHECKLISTED → INVITED → ACCEPTED → FUNDED → SUBMITTED → EVALUATED → APPROVED → PAID
                                            ↘ REJECTED → SUBMITTED (resubmit)
```

**Database**: SQLite + Drizzle ORM. All file bytes (≤ 5 MB) stored as BLOBs in the DB —
no external storage needed. `events` table is the append-only audit ledger that drives
the on-screen timeline.

**Auth**: HttpOnly HMAC-signed cookie `{userId, exp}` on top of real bcrypt
registration — the client and the freelancer see different controls;
Dana = freelancer). Role checks enforced on every server route.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | SQLite + Drizzle ORM + better-sqlite3 |
| AI | Vercel AI SDK v7 + OpenRouter (`@openrouter/ai-sdk-provider` v3) |
| PayPal | `@paypal/react-paypal-js` v10 (JS SDK v6) + direct REST for Payouts |
| Hosting | Render (Node service) |
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

See the **Demo data & walkthrough** section below — the database is pre-seeded
with a realistic demo workspace so judges land on a populated dashboard.

## License

MIT — see `LICENSE`.

## Demo data & walkthrough

### Seeded demo accounts (sandbox, no real money)

Real bcrypt accounts; the login page has one-click "Fill" buttons:

| Persona | Name | Role | Login |
|---|---|---|---|
| Client 1 | Maya Chen | client | `maya@proofpay.dev` / `demo1234` |
| Client 2 | Marcus Webb | client | `marcus@proofpay.dev` / `demo1234` |
| Client 3 | Priya Sharma | client | `priya@proofpay.dev` / `demo1234` |
| Freelancer | Dana Rivera | freelancer | `dana@proofpay.dev` / `demo1234` |

### What's pre-seeded (npm run db:reset / db:reseed)

`scripts/demo-data.ts` seeds 5 realistic projects and 7 milestones spanning the
entire workflow, all assigned to Dana so the freelancer dashboard is fully
populated out of the box:

| Milestone | Status | Shows the judge |
|---|---|---|
| Landing page hero & product showcase (Nimbus Store) | `FUNDED` | Active milestone, deadline in 5 days, awaiting proof |
| Analytics charts & KPI tiles (Pulseboard) | `FUNDED` | Second active project, deadline in 12 days |
| Dashboard UI implementation (Pulseboard) | `EVALUATED` | Submitted proof + completed AI evaluation (partial, 88/100) awaiting client approval |
| Payments & invoices REST integration (Orbit CRM) | `PAID` | **Complete showcase**: submission with screenshot proof, full-pass AI evaluation (96/100), client approval, successful payout |
| Responsive portfolio — mobile pass (Brightlane) | `REJECTED` | Revision flow: AI found misses, client left resubmission notes |
| Lighthouse performance budget (Northwind) | `ACCEPTED` | Client-side funding step |
| Image lazy-loading & caching headers (Northwind) | `INVITED` | Pending invitation waiting in Dana's inbox |

Each milestone carries a full `events` audit trail, an AI acceptance checklist,
and (where applicable) submissions, per-item AI evaluation results and payout
records — all read live from SQLite, nothing hardcoded in the UI.

### Demo vs. real PayPal — hard separation

- Every seeded milestone carries `is_demo = 1` in the database; every seeded
  PayPal identifier (order, capture, payout batch) is prefixed `DEMO-`.
- UI marks: milestone rows and detail pages show an amber **Demo data** chip;
  seeded payouts are labelled **Sample transaction**.
- API guards: the funding (`/orders`) and payout (`/payout`) routes refuse any
  demo record with `409 DEMO_RECORD`, so a demo milestone can **never** trigger
  a PayPal API call — no real money can move from seeded data, even by accident.
- `npm run db:reseed` wipes only demo records (demo users, `is_demo` milestones
  and everything with `DEMO-` PayPal ids) and reseeds — real registered
  accounts and their live milestones are preserved. `npm run db:reset` still
  deletes and rebuilds the whole database. On Render, the build runs
  `npm run db:seed-if-empty`, which seeds only when the DB is empty — so the
  first deploy boots with the demo workspace and later redeploys never wipe
  judge-created accounts.

### Scripted walkthrough (≈ 2:40)

1. **Log in as Dana (`dana@proofpay.dev`)** → fully populated freelancer
   dashboard: earnings, pending payments, upcoming deadlines, activity and
   payout history.
2. **Open "Payments & invoices REST integration"** (PAID) → the complete
   end-to-end example: proof screenshots, per-item AI evaluation, approval and
   sample payout.
3. **Open the EVALUATED milestone** → review the AI verdict (partial, 88/100)
   with per-item explanations.
4. **Switch to Maya (`maya@proofpay.dev`)** → accept an invite flow with a live
   project: new project → milestone → AI checklist → invite → fund via sandbox
   popup → Dana submits proof → AI evaluates → approve → PayPal payout.
5. Dana's Earnings page shows the real sandbox batch alongside the labelled
   sample rows.

## Key moments for judges

- **0:30** — AI checklist appears (structured output, Zod-validated)
- **1:00** — Real PayPal popup (sandbox approval window)
- **1:30** — AI verdict with per-item explanations
- **2:00** — Human approval gate (AI never moves money)
- **2:15** — Payout lands (real PayPal Payouts API, batch ID on screen)

## Negative testing (for judges who want to verify)

- Decline path: the capture route supports `PayPal-Mock-Response: {"mock_application_codes":"INSTRUMENT_DECLINED"}`
- Amount integrity: a $2 order cannot be captured against a $250 milestone (server-verified)
- Access control: freelancer cannot reach approve/fund/payout endpoints (403)
- Demo safety: funding/payout endpoints return `409 DEMO_RECORD` for seeded demo milestones

## Edge cases handled

- AI rate limit (429): automatic retry with backoff + fallback model chain
- AI credits exhausted (402): clear error screen with top-up link
- AI failure: milestone stays in current state, retry button provided
- Declined payment: friendly retry UI, no raw JSON dump
- Missing freelancer email: clear error message
- Empty milestone list: friendly empty state (the seeded demo workspace avoids
  this for judges entirely)