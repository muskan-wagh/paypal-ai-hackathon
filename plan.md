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

## Phase 2 — Day-1 risk spikes (Day 1–2) — ✅ COMPLETE (2026-11-01)
- [x] **Spike A — Checkout popup:** server creates an order (Orders v2) →
      `@paypal/react-paypal-js` renders buttons → popup opens → sandbox buyer approves →
      server captures (Payments) — **VERIFIED end-to-end** (order `3JM7QA816NR0187259` →
      capture `COMPLETED`; true capture id read from `purchase_units[0].payments.captures[0]`)
- [x] Capture negative test: header
      `PayPal-Mock-Response: {"mock_application_codes":"INSTRUMENT_DECLINED"}` → mocked
      decline returned through our parser (422 + `debug_id`) — **VERIFIED**
- [x] **Spike B — Payouts:** OAuth client-credentials token (cached) →
      `POST /v1/payments/payouts` via direct fetch → poll `GET /v1/payments/payouts/{id}` →
      **VERIFIED**: batch `K896R37KPUKQY` `PENDING → PROCESSING` → item `SUCCESS`
      (transaction `6XS234528F691971M`, USD 2.00) in ~10 s
- [x] **Country blocker found + fixed:** default developer-country sandbox app returned
      `PAYOUT_NOT_AVAILABLE` AND generic popup error at checkout — root cause: sender/merchant
      sandbox account country. **Fix (committed): `proofpay-us` sandbox app on a US-country
      business account for BOTH checkout and payouts** (`PAYPAL_CLIENT_*` = US app;
      optional `PAYPAL_PAYOUT_CLIENT_*` override remains if needed later)
- [x] **AI spike:** OpenRouter key verified (`/api/v1/key` → 200, free tier) + `generateObject`
      structured verdict via Zod; pinned `google/gemma-4-31b-it:free` was upstream-pool
      rate-limited (429) → **primary swapped to `nvidia/nemotron-3.5-super-vl:free`,
      Gemma as fallback** + bounded 429-retry (~13 s typical)
- [ ] **Decision gate:** not needed — real Payouts round-trip verified; Plan B ledger not required

## Phase 3 — Foundation (Day 2–3) — PARTIAL COMPLETE (2026-11-01)
- [x] Drizzle schema:
      `users (role: client|freelancer, sandboxPaypalEmail)` ·
      `milestones (brief, amountCents, currency, deadline, paypalOrderId, paypalCaptureId,
      status)` · `checklist_items (title, acceptanceCriteria, checkType, sortOrder)` ·
      `submissions + files (BLOB ≤ 5 MB)` · `evaluations + eitems (verdict, explanation,
      rawJson)` · `payouts (batchId, status, receiver, rawJson)` ·
      `events (audit ledger: type, actor, payload, createdAt)`
- [x] State machine constants enforced **server-side only** (`src/lib/state-machine.ts`):
      `DRAFT → CHECKLISTED → FUNDED → SUBMITTED → EVALUATED → APPROVED|REJECTED → PAID`
- [x] `npm run db:reset` seed script: Maya (client), Dana (freelancer; payout email =
      `PAYPAL_PAYOUT_RECEIVER`), one DRAFT milestone,
      one FUNDED milestone (with AI checklist + events so the demo starts mid-flow)
- [x] Persona auth: login screen → HttpOnly HMAC-signed cookie `{ userId, exp }`,
      logout, edge middleware (presence) + **server-side role hydration checks**
      (verified: no-cookie → 307, tampered HMAC → 307, valid → pages render)
- [x] App shell: `/milestones` list w/ status chips, `/milestones/[id]` detail w/
      checklist • submissions • evaluation cards • payouts • events timeline,
      per-role "next action" hints, progress pillsline block fed by `events`

## Phase 4 — Milestone creation + AI checklist (Day 3)
- [ ] Client form: title, brief, amount (integer cents), currency, deadline, freelancer select
- [x] AI call #1 — checklist generation (**via `@openrouter/ai-sdk-provider`**):
      `generateObject` + Zod `ChecklistSchema` → 4–8 items
      `{ title, acceptanceCriteria, checkType: visual|document|scope|quality }`,
      low temperature, validated, one retry on invalid (Response Healing plugin
      auto-repairs malformed JSON — leave the provider default ON);
      no free-text chat —
      **END-TO-END VERIFIED** (shared fallback runner `src/lib/ai.ts` w/ 429-retry;
      live run: nemotron generated 6 items; transient multi-model failure + retry
      also verified — state stayed DRAFT on failure, advanced only on success)
- [x] Insert rows to `checklist_items`; milestone → `CHECKLISTED`; `events` logged
      (role/state guards 401/403/409 verified; `CHECKLIST_CREATED` written by actor `ai`)
- [x] Checklist rendered in milestone detail for both roles
- [ ] "Raw AI output" viewer toggle (stores full model JSON) — traceability on camera

## Phase 5 — Funding flow (Day 3–4) — CODE COMPLETE (happy-path capture awaits user's popup click)
- [x] Client presses **Fund milestone** → server creates the PayPal order →
      `PayPalButtons` popup shows the **real sandbox approval window**
      (milestone-aware `POST /api/milestones/[id]/orders`; verified: real $250.00 order
      `46024936NC577245A` CREATED + `ORDER_CREATED` event; freelancer → 403)
- [x] `onApprove` → server capture → store `paypalCaptureId` → `FUNDED` —
      capture route live with **order-integrity checks** (server verifies the approved
      order's amount/currency == milestone before capturing — $2-order attack blocked,
      `AMOUNT_MISMATCH` verified; `ORDER_NOT_APPROVED` 409; transition asserted)
- [x] Decline path: `INSTRUMENT_DECLINED` (or real decline) → friendly retry UI, not a raw
      JSON dump (`fund-button.tsx` friendly-error mapper; mocked decline verified through
      the real capture route — state stays CHECKLISTED, no capture id)
- [x] `FUNDED` / `CAPTURED` events written; timeline updates (FUNDED written only on real
      capture success success — verified via negative tests that nothing fires early)

## Phase 6 — Proof submission + AI evaluation (Day 4–5) — COMPLETE (2026-11-01)
- [x] Freelancer view: upload images/PDF (≤ 5 MB, BLOB in DB) + short notes
      (multipart route + `ProofSubmitForm` client component with file picker; verified:
      378-byte PNG stored as BLOB, served byte-identical via `/api/files/[id]` to members)
- [x] PDF → text extraction server-side (unpdf); images passed directly to the pinned
      vision-capable OpenRouter model (free tier verified available; fallback chain
      routes on 429/parse failure — verified end-to-end)
- [x] AI call #2 — proof evaluation vs checklist: Zod `EvaluationSchema` → per-item
      `pass|partial|fail` + explanation, overall score 0–100, written summary
      (verified: 4-item checklist evaluated → 0/100 fail on a placeholder image;
      all items correctly marked fail with concrete visual explanations)
- [x] Store `evaluations`/`eitems` + `rawJson`; milestone → `EVALUATED`
      (verified: milestone 2 → EVALUATED, EVALUATED event logged with model + score)
- [x] Verdict UI: per-item cards with explanations (client and freelancer both see it)
- [x] Guardrails verified in code review: AI has **no PayPal credentials and no tools**;
      payout requires human approval — never model output alone
- [x] File download endpoint `/api/files/[id]` with membership gating (401 for strangers)

## Phase 7 — Approval, Payouts, timeline (Day 5–6) — COMPLETE (2026-11-01)
- [x] Client-only **Approve** button (state `EVALUATED → APPROVED`, event logged)
- [x] Reject path: → `REJECTED` + notes stored in event payload (freelancer resubmits;
      refund of captured payment deferred — PayPal refund API not wired, captured funds
      stay with the client for the demo; money-moving refund is out of scope)
- [x] Payouts execution: `POST /v1/payments/payouts` (US-app creds) → store `batchId` →
      poll item status → `PAYOUT_COMPLETED`/`PAID` event → milestone → `PAID`
      **VERIFIED end-to-end**: batch `AWXRTQCSCLBHW`, PENDING, $200.00 → US sandbox
      personal account, ~5 s
- [x] Money timeline page renders from `events` + live payout status
      (Timeline component with EVENT_LABELS for all 9 event types; verified rendering)
      (NOT Transaction Search — 3 h lag makes it wrong for the live view)
- [ ] Full end-to-end dry run: create → fund → submit → evaluate → approve → payout lands
      in the sandbox Personal account (screenshot for README)

## Phase 8 — Resilience & polish (Day 6–7) — COMPLETE (2026-11-01)
- [x] Global error handling: PayPal errors → capture + surface `debug_id`
      (spikeErrorResponse maps PaypalError → {code, message, details, debugId};
      verified: mocked decline returned debug_id `3fc230ceac4f5`)
- [x] OpenRouter error handling (verified error shapes):
      `429` → honor `Retry-After` header + retry with backoff + route through the fallback
      model chain (shared runner `src/lib/ai.ts`; verified live: nemotron 429-retry + fallback
      to gemma on upstream-pool contention)
      `402` → clear "credits exhausted" screen with the key-usage check link
      (`CREDITS_EXHAUSTED` → 402 + usageUrl/keyUrl in all AI routes; health panel surfaces
      daily free quota via `/api/health` → OpenRouter `/api/v1/key`)
- [x] AI failure containment: retries capped at 1 → then "evaluation failed, try again" —
      never auto-approve/payout from a model result (verified: failed generation left
      milestone in DRAFT; failed evaluation left milestone in SUBMITTED; approve/payout
      routes have zero AI imports)
- [x] Access-control pass: freelancer cannot reach approve/fund endpoints; AI endpoints
      cannot reach PayPal endpoints (matrix verified: Dana→approve/reject/payout/orders all 403;
      Maya→submit 403; grep audit: zero AI route imports PayPal; zero secrets committed)
- [x] Empty states: milestone list, submissions, evaluations, timeline ("No activity yet")
- [x] Health/debug panel: `/api/health` + `HealthPanel` client component on `/spike`
      (OpenRouter key validity + daily free quota, PayPal token fetch, DB counts)
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
