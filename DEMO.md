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

# 4. Seed the demo database (Maya = client, Dana = freelancer, demo project + 2 milestones)
npm run db:reset

# 5. Run
npm run dev
# → http://localhost:3000  (log in: maya@proofpay.dev / dana@proofpay.dev — password demo1234)
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

See `DEMO.md` for the scripted walkthrough and test credentials.

## License

MIT — see `LICENSE`.<|end|><|start|>advisor to=bash<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="command">
cat > /home/maahi/Desktopp/paypal-ai-hackathon/DEMO.md << 'DEMOEOF'
# ProofPay — Demo Walkthrough

## Test credentials (sandbox, no real money)

Real email + password accounts (bcrypt):

| Persona | Name | Role | Login |
|---|---|---|---|
| Client | Maya Chen | client | `maya@proofpay.dev` / `demo1234` |
| Freelancer | Dana Rivera | freelancer | `dana@proofpay.dev` / `demo1234` |

(The login page has one-click "Fill" buttons for both demo accounts.)

Sandbox PayPal buyer: the US personal account (`sb-…@personal.example.com`).
Sandbox PayPal seller/merchant: the US business account attached to the `proofpay-us` app.

## Free access for judges

- Hosted demo URL: (add after deployment)
- Repo: public, MIT license, visible in About
- All materials in English
- Test credentials above work through Dec 15, 2026
- No expiring credentials

## Scripted walkthrough (≈ 2:40)

1. **Log in as Maya (`maya@proofpay.dev`)** → client dashboard (stats + next-step hints)
2. **New project → add milestone** ("E2E checkout card", $50, short brief) → DRAFT
3. **Generate the AI acceptance checklist** (OpenRouter / nemotron) → CHECKLISTED
4. **Invite** `dana@proofpay.dev` from the milestone page → INVITED (invite lands in the
   freelancer's dashboard *and* as a shareable link)
5. **Log in as Dana (`dana@proofpay.dev`)** → invitation card → **Accept** → ACCEPTED
6. **Switch to Maya** → fund the milestone:
   real sandbox popup → approve $50.00 → FUNDED
7. **Switch to Dana** → open the funded milestone → submit proof (screenshot + notes)
   - AI evaluates against the checklist → per-item pass/partial/fail + score 0–100
   - Milestone → EVALUATED
8. **Switch to Maya** → review the AI verdict → **Approve** → APPROVED
9. **Send PayPal payout** → real PayPal Payouts API → batch created → PAID
   - Dana's Earnings page + Maya's Payments page both show the batch ID + status

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

## Edge cases handled

- AI rate limit (429): automatic retry with backoff + fallback model chain
- AI credits exhausted (402): clear error screen with top-up link
- AI failure: milestone stays in current state, retry button provided
- Declined payment: friendly retry UI, no raw JSON dump
- Missing freelancer email: clear error message
- Empty milestone list: friendly empty state
DEMOEOF
echo "DEMO.md written"