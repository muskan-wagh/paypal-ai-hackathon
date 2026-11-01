# ProofPay — Build Plan (PayPal AI Hackathon 2026)

> **Product:** ProofPay — AI-gated milestone payouts. A client creates a freelance task and
> funds it via PayPal; AI generates an acceptance checklist from the task brief; the
> freelancer submits proof; AI evaluates the proof against the checklist and explains the
> result; the client reviews and gives the final human approval; PayPal Payouts sends the
> money to the freelancer.
>
> **Why it fits the hackathon:** the rules require a meaningful PayPal (sandbox) +
> AI integration — in ProofPay, PayPal is the money rail at three real points (funding
> approval, capture, payouts) and the AI is load-bearing (checklist generation + proof
> evaluation), with a human approval gate so AI never moves money.

**Deadline:** submissions close **Tue, Nov 12, 2026 @ 12:00 PM PST**. The organizer's update
recommends submitting a draft by **Nov 5** for early eligibility review (edits allowed until
the deadline). Judging Dec 1–15; winners ~Dec 21. Timeline basis: today is **Nov 1 → 11 build days**.

**Locked decisions (technical analysis, see chat history):**
Next.js 15 + TypeScript · Tailwind CSS · SQLite + Drizzle ORM (BLOB file storage, seed
script) · persona cookie auth (HttpOnly, HMAC-signed, server-side role checks) · Vercel AI
SDK (`ai@^7`) + **OpenRouter** (`@openrouter/ai-sdk-provider@3.x`, verified: supports
`generateObject` with Zod + JSON "Response Healing"; requires Node 22+, ESM-only) with a
pinned model id + fallback chain (structured outputs via Zod) · `@paypal/react-paypal-js`
· `@paypal/paypal-server-sdk` (Orders + Payments controllers) · **Payouts + Transaction
Search via direct REST `fetch`** (verified: the server SDK has no Payouts controller) ·
Render hosting ($50 sponsor credits) · public GitHub repo with a visible OSI license.

**Verified source links (from the research pass — use these, not the stale docs.paypal.ai links):**
- Rules: https://paypalaihackathon.devpost.com/rules · Overview: https://paypalaihackathon.devpost.com/
- Resources: https://paypalaihackathon.devpost.com/resources · FAQs: /details/faqs
- Sandbox guide: https://github.com/paypaldev/getting-started-with-paypal-sandbox
- Next.js checkout guide: https://developer.paypal.com/guides/nextjs-checkout
- Payouts: https://developer.paypal.com/api/payouts/ (+ `/test-go-live`, `/api/payouts/webhooks`)
- Orders v2: https://developer.paypal.com/docs/api/orders/v2/ · Payments v2: https://developer.paypal.com/docs/api/payments/v2
- Transaction Search: https://developer.paypal.com/docs/api/transaction-search/v1/
- Negative testing: https://developer.paypal.com/tools/sandbox/negative-testing/
- SDKs verified on npm: `@paypal/react-paypal-js@10.x`, `@paypal/paypal-server-sdk@2.x` (only
  Orders/Payments/Vault/TransactionSearch/Subscriptions controllers), `@paypal/agent-toolkit@1.x`
- **Transaction Search caveat (verified):** up to 3 h lag and 31-day window — never use it for
  the instant "payment landed" UI; use the Payouts API response + our own `events` ledger.
- **OpenRouter (verified live 2026-11-01):** docs https://openrouter.ai/docs —
  limits page `openrouter.ai/docs/api-reference/limits`; key at openrouter.ai/keys;
  provider README (npm `@openrouter/ai-sdk-provider`, v3.x targets `ai@^7`, Node 22+, ESM-only;
  `createOpenRouter({ apiKey })` + `openrouter('model/id')`; documents `generateObject`/`streamObject`
  and the Response Healing plugin for malformed-JSON repair).
  Free-tier limits: `:free` models → **20 req/min**; **50 req/day** with zero credits ever
  purchased → **1,000 req/day** after purchasing ≥ $10 credits all-time; 402 (credits) /
  429 (rate) error shapes documented; `GET /api/v1/key` exposes remaining daily free quota.
  Live model scan (2026-11-01): 452 models, 14 `:free`, **8 free with image input**
  (e.g. `google/gemma-4-31b-it:free`; list shifts — pin ids by env at build time).

---

## Phase 0 — Research ✅ COMPLETE
- [x] Rules, prizes ($67.5k cash / $69,750 incl. Render credits), eligibility, judging criteria analyzed
- [x] Sponsor pages reviewed — AG Grid, Render unlocked; Elastic/KERNEL/Postman/Zapier/Astropods have no prize; APIMatic/Bryntum/Channel3 noted but skipped
- [x] PayPal SDK/API capabilities verified (versions, controller list, sandbox mechanics, negative testing)
- [x] Five ideas generated + scored (ProofPay 27.5/30 — winner)
- [x] Tech stack locked

## Phase 1 — Environment & credentials setup (Day 1)
- [ ] Join hackathon on Devpost (if not already) + start the project entry & team section
- [ ] PayPal Developer account → sandbox:
  - [ ] Dashboard → Apps & Credentials → Sandbox tab → copy **Client ID + Secret** into `.env.local`
  - [ ] Confirm both default sandbox accounts exist (Personal buyer / Business seller)
  - [ ] **Check app feature flags** — is Payouts enabled for the app? (unverified behavior — inspect now)
  - [ ] Log in at https://www.sandbox.paypal.com as the Personal account; verify the balance
- [ ] AI provider: OpenRouter (https://openrouter.ai) — account + API key (`OPENROUTER_API_KEY`);
  - [ ] **Pin the demo model in `.env` (`AI_MODEL`)** — primary: a free vision-capable model
        (image input required for proof evaluation; today's free-vision list includes
        `google/gemma-4-31b-it:free` — re-verify live at setup, the list shifts)
  - [ ] Configure fallback chain (one more free model → one cheap paid model; OpenRouter
        routing supports fallback models, wired via the provider's `extraBody`)
  - [ ] Optional but recommended: one-time top-up of $10 credits → lifts free-model daily
        cap 50 → 1,000 req/day and removes free-tier pacing for paid models
  - [ ] Record the exact pinned model id(s) — needed for the submission "Tools" field
- [ ] Repo: keep this repo public with a license file (MIT or Apache-2.0) **and** a detectable license in the About section
- [ ] Scaffold: `create-next-app@15` (App Router, TS) + Tailwind, Drizzle, better-sqlite3,
      `@paypal/react-paypal-js`, `@paypal/paypal-server-sdk`, `ai@^7`, `zod`,
      `@openrouter/ai-sdk-provider` · **Node 22+** required by the OpenRouter provider
      (pin Node in `engines` in package.json; set Node 22 on Render as well)
- [ ] `.env.example` committed; real `.env.local` git-ignored — secrets never in repo (also mandated by the organizer update)

## Phase 2 — Day-1 risk spikes (Day 1–2) — de-risk the two unknowns first
- [ ] **Spike A — Checkout popup:** server creates an order (Orders v2) →
      `@paypal/react-paypal-js` renders buttons → popup opens → sandbox buyer approves →
      server captures (Payments) → money moves to the seller account
- [ ] Capture negative test: header
      `PayPal-Mock-Response: {"mock_application_codes":"INSTRUMENT_DECLINED"}` → decline path works
- [ ] **Spike B — Payouts:** OAuth client-credentials token (cached) →
      `POST /v1/payments/payouts` via direct fetch, receiver = the sandbox **Personal**
      account email → poll `GET /v1/payments/payouts/{batch_id}` → item reaches `SUCCESS`
      → confirm the money landed in the buyer account
- [ ] Record both request/response payloads in a scratch note (becomes README + debugging evidence)
- [ ] **Decision gate:** if Payouts is blocked in sandbox → adopt Plan B:
      always attempt the real call, store + display the raw response, and fall back to a
      labeled "simulated" ledger entry toggle (integration remains genuine; rules satisfied)

## Phase 3 — Foundation (Day 2–3)
- [ ] Drizzle schema:
      `users (role: client|freelancer, sandboxPaypalEmail)` ·
      `milestones (brief, amountCents, currency, deadline, paypalOrderId, paypalCaptureId,
      status)` · `checklist_items (title, acceptanceCriteria, checkType, sortOrder)` ·
      `submissions + files (BLOB ≤ 5 MB)` · `evaluations + eitems (verdict, explanation,
      rawJson)` · `payouts (batchId, status, receiver, rawJson)` ·
      `events (audit ledger: type, actor, payload, createdAt)`
- [ ] State machine constants enforced **server-side only**:
      `DRAFT → CHECKLISTED → FUNDED → SUBMITTED → EVALUATED → APPROVED|REJECTED → PAID`
- [ ] `npm run db:reset` seed script: Maya (client), Dana (freelancer), one DRAFT milestone,
      one FUNDED milestone (so the demo can start mid-flow if needed)
- [ ] Persona auth: login screen → HttpOnly HMAC-signed cookie `{ userId, exp }`,
      logout, middleware, **server-side role checks** (only a client can approve/fund;
      only a freelancer can submit)
- [ ] App shell: milestone list, milestone detail, money-timeline block fed by `events`

## Phase 4 — Milestone creation + AI checklist (Day 3)
- [ ] Client form: title, brief, amount (integer cents), currency, deadline, freelancer select
- [ ] AI call #1 — checklist generation (**via `@openrouter/ai-sdk-provider`**):
      `generateObject` + Zod `ChecklistSchema` → 4–8 items
      `{ title, acceptanceCriteria, checkType: visual|document|scope|quality }`,
      low temperature, validated, one retry on invalid (Response Healing plugin
      auto-repairs malformed JSON — leave the provider default ON);
      no free-text chat
- [ ] Insert rows to `checklist_items`; milestone → `CHECKLISTED`; `events` logged
- [ ] Checklist rendered in milestone detail for both roles
- [ ] "Raw AI output" viewer toggle (stores full model JSON) — traceability on camera

## Phase 5 — Funding flow (Day 3–4)
- [ ] Client presses **Fund milestone** → server creates the PayPal order →
      `PayPalButtons` popup shows the **real sandbox approval window**
- [ ] `onApprove` → server capture (Payments controller) → store `paypalCaptureId` → `FUNDED`
- [ ] Decline path: `INSTRUMENT_DECLINED` (or real decline) → friendly retry UI, not a raw JSON dump
- [ ] `FUNDED` / `CAPTURED` events written; timeline updates

## Phase 6 — Proof submission + AI evaluation (Day 4–5)
- [ ] Freelancer view: upload images/PDF (≤ 5 MB, BLOB in DB) + short notes
- [ ] PDF → text extraction server-side; images passed directly to the pinned
      **vision-capable** OpenRouter model (free tier verified available; if the pinned
      free model rejects images or is rate-limited, the fallback chain routes to the next)
- [ ] AI call #2 — proof evaluation vs checklist: Zod `EvaluationSchema` → per-item
      `pass|partial|fail` + explanation, overall score 0–100, written summary
- [ ] Store `evaluations`/`eitems` + `rawJson`; milestone → `EVALUATED`
- [ ] Verdict UI: per-item cards with explanations (client and freelancer both see it)
- [ ] Guardrails verified in code review: AI has **no PayPal credentials and no tools**;
      payout requires human approval — never model output alone

## Phase 7 — Approval, Payouts, timeline (Day 5–6)
- [ ] Client-only **Approve & Pay** button (state `EVALUATED → APPROVED`, event logged)
- [ ] Reject path: → `REJECTED` + Payments refund of the captured payment; event logged
- [ ] Payouts execution: `POST /v1/payments/payouts` → store `batchId` → poll item status
      → `PAYOUT_COMPLETED` event → milestone → `PAID`
- [ ] Money timeline page renders from `events` + live payout status
      (NOT Transaction Search — 3 h lag makes it wrong for the live view)
- [ ] Full end-to-end dry run: create → fund → submit → evaluate → approve → payout lands
      in the sandbox Personal account (screenshot for README)

## Phase 8 — Resilience & polish (Day 6–7)
- [ ] Global error handling: PayPal errors → capture + surface `debug_id` (PayPal support convention)
- [ ] OpenRouter error handling (verified error shapes):
      `429` → honor `Retry-After` header + retry with backoff + route through the fallback
      model chain; `402` → clear "credits exhausted" screen with the key-usage check link
      (`GET /api/v1/key` surface daily free-quota remaining in a small debug/health panel)
- [ ] AI failure containment: retries capped at 1 → then "evaluation failed, try again" — never auto-approve/payout from a model result
- [ ] Access-control pass: freelancer cannot reach approve/fund endpoints; AI endpoints cannot reach PayPal endpoints
- [ ] Edge cases: deadline passed, duplicate submission, reupload after rejection, missing files
- [ ] Visual polish: coherent Tailwind look, empty states, loading states, mobile-safe layout
- [ ] "Built With" accuracy: list only what is actually used (organizer guidance: PayPal and AI "impossible to miss")

## Phase 9 — Optional sponsor surface (Day 7 — only if the core demo is green)
- [ ] AG Grid / AG Studio money dashboard over `/v1/reporting/transactions`
      (handle 31-day window; fall back to the `events` ledger view when data lags)
      → targets the **$11k AG Grid prize pool** (3 AG-prizes and a sponsor judge exist)
- [ ] Render deployment already satisfies **Best Use of Render** (credits claim + deploy)
- [ ] Skip both if the demo isn't flawless without them — no new risk allowed near the deadline

## Phase 10 — Documentation (Day 8)
- [ ] README: pitch (problem in 2 sentences), screenshots, **Run in < 5 minutes**
      (clone → `.env.local` keys → `npm i` → `npm run db:reset` → `npm run dev` → persona logins)
- [ ] `DEMO.md`: scripted walkthrough + any test credentials judges need, free access through Dec 15
- [ ] One architecture diagram (image): user → AI → human gate → PayPal timeline
- [ ] "Tools" statement: exact PayPal products used + OpenRouter with the **exact pinned
      model id(s)** actually used + how the AI is used (rule requires naming the real tool)
- [ ] Guardrails section: AI never moves money; approval is human-only; audit trail shown
- [ ] License visible in About; repo topics updated; webpack of secrets check (`git log` scan)

## Phase 11 — Deployment (Day 8)
- [ ] Deploy on Render (Node service or Dockerfile); env vars set in the Render dashboard (not in the repo)
- [ ] Post-deploy: seed demo data; run the **hosted** end-to-end (fund + payout) once for real
- [ ] Save the hosted URL for the Devpost form; verify `npm run dev` still works locally for clone-and-run judges

## Phase 12 — Demo video (Day 9)
- [ ] Script (≤ 3:00): problem 0:20 → checklist generated 0:30 → proof uploaded 0:25 →
      AI verdict 0:35 → human approval 0:25 → **payout lands on screen** 0:35 → impact close 0:30
- [ ] On camera: the PayPal popup, the AI structured output, the human Approve button, the payout receipt — PayPal and AI named explicitly
- [ ] Rehearse the 3-tab choreography (client tab / freelancer tab / PayPal popup); record ≥ 2 full takes and pick the best
- [ ] Upload to YouTube — **public**, link saved; no third-party trademarks or copyrighted music

## Phase 13 — Submission & final checks (Day 9–11; draft ASAP, final by Nov 12, 12:00 pm PST)
- [ ] Enter the draft submission (target: before Nov 5 for the early eligibility review)
- [ ] Form fields: name, description, hosted demo URL, repo URL, Tools field (AI model +
      PayPal products), team members
- [ ] Pre-flight checklist:
  - [ ] Repo public + OSI license detectable in the About section
  - [ ] README passes a from-clone test on a fresh machine
  - [ ] Hosted URL live and seeded
  - [ ] Video < 3:00, public on YouTube, shows the real device flow end to end
  - [ ] Sandbox-only environment; no secrets committed (git history scan)
  - [ ] PayPal **and** AI named in the description, video, and Built With
  - [ ] All materials in English
  - [ ] Free access for judges through Dec 15 (no expiring test credentials)
- [ ] Final edits locked before Nov 12, 12:00 pm PST
- [ ] Optional second entry (AgentBarter) — only if the first submission is green and time remains

---

## Known risks (from verified research)
| Risk | Status | Mitigation in plan |
|---|---|---|
| Payouts sandbox behavior unverified | ⚠️ test Day 1 | Phase 2 Spike B + Plan B toggle |
| Sandbox app feature flags (e.g. payout enablement) | ⚠️ inspect | Phase 1 feature-flag check |
| Payout item status is async in the sandbox | possible | status polling in Phase 7; never fake `SUCCESS` |
| Two-sided demo choreography | moderate | Phase 12 rehearsal protocol, ≥ 2 takes |
| Transaction Search 3 h lag (verified) | known | timeline from `events`; search = history/dashboard only |
| OpenRouter free-tier daily cap (50 req/day w/o credits; 1,000/day after $10 top-up — verified) | low–moderate | fallback model chain + `429` backoff (Phase 8) + optional $10 top-up (Phase 1); judge runs need ~3–5 req only |
| Free model list drift (verified: 14 `:free`, 8 vision-capable today — shifts) | known | pin model id via env + fallback chain; re-verify live at Phase 6 |
| Nov 5 early-review cutoff | deadline | Phase 13 draft target |

## Prize targets
| Path | Prize | What it needs |
|---|---|---|
| Grand 1st/2nd/3rd | $12k / $8k / $5k | Strong across all five criteria |
| Most Impactful / Best Use of PayPal + AI / Best Demo / Agentic / Creative | $5k each | Deep loop + polished pitch |
| Best Use of AG Grid (optional) | $5k/$2k/$1k×3 | Phase 9 dashboard |
| Best Use of Render | $1k/$750/$500 credits | Phase 11 deploy |
