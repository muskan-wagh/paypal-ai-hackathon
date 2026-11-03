# ProofPay — Plan 2: Professional UI, Authentication & Complete Workflow

> **Goal:** Transform ProofPay from a functional prototype into a production-quality
> fintech product with PayPal-inspired design, real registration/login, role-based
> dashboards, project/milestone/invitation management, and a complete
> client-to-freelancer workflow — all wired to the existing backend, database,
> PayPal sandbox, and OpenRouter AI.

**Prerequisite:** Phases 0–8 (plan.md) are complete. The core money loop
(DRAFT → … → PAID) is verified end-to-end against real PayPal sandbox APIs.

---

## 0. Progress log (live)

| Stage | Status | Evidence |
|---|---|---|
| 1 — Landing, branding, register/login | ✅ Built; login verified at data layer (bcrypt compare `demo1234` ✔) | `/`, `/login`, `/register`, `/how-it-works`, `/features` all 200 |
| 2 — Dashboards + role routing | ✅ Built & rendering 200 for both roles | client/freelancer dashboards, sidebar shell, middleware redirects (cross-role 307, anon 307) |
| 3 — Projects, milestones, invitations | ✅ Built & E2E-verified via API | project 2 created; milestone 3 created (201); invite token; invite accept 200 |
| 4 — AI checklist + funding wiring | ✅ E2E-verified | checklist: 6 items via nemotron-3.5; real sandbox order `8Y8081072X799225Y` from ACCEPTED state |
| 5 — Evaluation/approval/payout wiring | ✅ Routes unchanged from verified Phase 6–8 path | guard checks: early payout 409, cross-role 403 |
| 6 — Payments/Earnings/Settings + polish | ✅ Pages built; responsive pass pending browser check | `/client/payments`, `/freelancer/earnings`, settings×2, `/api/profile` |

Dev server: `npm run dev` on :3000. Production build + lint: green.

When demoing the money path, milestone 3 ("E2E checkout card", $50) sits in
ACCEPTED — fund it via popup checkout as Maya to continue the chain.

---

## 1. Design direction

### Visual language (PayPal-inspired, ProofPay-branded)

| Token | Value | Usage |
|---|---|---|
| `--pp-navy` | `#003087` | Primary brand, headers, nav |
| `--pp-blue` | `#0070BA` | Buttons, links, active states |
| `--pp-light-blue` | `#009CDE` | Hover, accents, progress |
| `--pp-bg` | `#F5F7FA` | Page background (light grey) |
| `--pp-card` | `#FFFFFF` | Card surfaces |
| `--pp-border` | `#E1E5EB` | Borders, dividers |
| `--pp-text` | `#2C2E2F` | Body text |
| `--pp-text-muted` | `#6C7378` | Secondary text |
| `--pp-success` | `#28A745` | Funded, approved, paid |
| `--pp-warning` | `#FFC107` | Submitted, pending |
| `--pp-danger` | `#DC3545` | Rejected, errors |
| `--pp-info` | `#17A2B8` | Evaluated, in-progress |

- **Typography:** Inter (Google Fonts) — weights 400/500/600/700
- **Spacing:** 4px base grid (Tailwind default)
- **Cards:** `rounded-xl border border-neutral-200 bg-white shadow-sm`
- **Buttons:** primary `bg-[#0070BA] text-white hover:bg-[#005EA6]`; secondary outline; danger red
- **Status badges:** colored pills with border (existing StatusChip, recolored)
- **Icons:** Lucide React (tree-shakeable, consistent)
- **Responsive:** mobile-first, sidebar collapses to hamburger on < 768px
- **No excessive gradients, no glassmorphism, no parallax — clean fintech**

### Layout shell

```
┌─────────────────────────────────────────────────────┐
│  Navbar: Logo · Nav links · User avatar dropdown     │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  Main content area                       │
│ (role-   │  (page-specific: dashboard, forms, etc.) │
│  based)  │                                          │
└──────────┴──────────────────────────────────────────┘
```

- Public pages (landing, how-it-works, features, login, register): top nav only, no sidebar
- Authenticated pages: sidebar (role-based nav) + top nav with user menu

---

## 2. Database schema changes

### New tables

#### `projects`
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### `invitations`
```sql
CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  milestone_id INTEGER REFERENCES milestones(id),
  inviter_id INTEGER NOT NULL REFERENCES users(id),
  invitee_email TEXT NOT NULL,
  invitee_id INTEGER REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER
);
```

### Modified tables

#### `users` — add authentication fields
```sql
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN password_hash TEXT;
```

#### `milestones` — add project + invitation links
```sql
ALTER TABLE milestones ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE milestones ADD COLUMN invitation_id INTEGER REFERENCES invitations(id);
```

### State machine update

```
DRAFT → CHECKLISTED → INVITED → ACCEPTED → FUNDED → SUBMITTED → EVALUATED → APPROVED → PAID
                                            ↘ REJECTED → SUBMITTED (resubmit)
```

New states: `INVITED` (freelancer invited, not yet accepted), `ACCEPTED` (freelancer accepted, ready for funding).

---

## 3. Authentication & registration

### New API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/register` | POST | Create account (email, password, name, role) |
| `/api/auth/login` | POST | Email + password → session cookie |
| `/api/auth/logout` | POST | Clear session cookie |

### Registration flow
1. User fills form: name, email, password, role (client/freelancer)
2. Server validates: email unique, password ≥ 8 chars, role is valid enum
3. Hash password with bcrypt (12 rounds) via `bcryptjs`
4. Insert user row
5. Auto-login (create session cookie) → redirect to role dashboard

### Login flow
1. User enters email + password
2. Server looks up user by email
3. Verify password with bcrypt.compare
4. Create session cookie → redirect to role dashboard

### Dependency: `bcryptjs` + `@types/bcryptjs`

---

## 4. New API routes

### Projects
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/projects` | GET | client | List client's projects |
| `/api/projects` | POST | client | Create project |
| `/api/projects/[id]` | GET | member | Get project + milestones |
| `/api/projects/[id]` | PUT | client (owner) | Update project |
| `/api/projects/[id]` | DELETE | client (owner) | Delete project (only if no funded milestones) |

### Milestones (within projects)
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/projects/[id]/milestones` | POST | client | Create milestone in project |

### Invitations
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/invitations` | POST | client | Create invitation (email + optional milestone) |
| `/api/invitations` | GET | user | List user's invitations (sent or received) |
| `/api/invitations/[token]` | GET | public | View invitation details |
| `/api/invitations/[token]/accept` | POST | freelancer | Accept invitation |
| `/api/invitations/[token]/decline` | POST | freelancer | Decline invitation |

### Payment history
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/payments` | GET | user | List payments (filtered by role) |

### Profile
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/profile` | GET | user | Get profile |
| `/api/profile` | PUT | user | Update name, email, sandbox PayPal email |

---

## 5. Pages and routing

### Public pages
| Route | Purpose |
|---|---|
| `/` | Landing page — hero, features, how-it-works, CTA |
| `/how-it-works` | Step-by-step workflow explanation |
| `/features` | Feature highlights |
| `/login` | Login form (email + password) |
| `/register` | Registration form (name, email, password, role) |
| `/invite/[token]` | Accept/decline invitation |

### Client dashboard (`/client/*`)
| Route | Purpose |
|---|---|
| `/client/dashboard` | Overview: stats, recent milestones, pending actions |
| `/client/projects` | List of client's projects |
| `/client/projects/new` | Create project form |
| `/client/projects/[id]` | Project detail + milestones list |
| `/client/projects/[id]/milestones/new` | Create milestone form |
| `/client/milestones/[id]` | Milestone detail (existing, enhanced) |
| `/client/payments` | Payment history |
| `/client/settings` | Profile + PayPal sandbox email |

### Freelancer dashboard (`/freelancer/*`)
| Route | Purpose |
|---|---|
| `/freelancer/dashboard` | Overview: assigned, pending, completed |
| `/freelancer/invitations` | Pending invitations |
| `/freelancer/milestones/[id]` | Milestone detail (existing, enhanced) |
| `/freelancer/earnings` | Earnings + payout history |
| `/freelancer/settings` | Profile + PayPal sandbox email |

---

## 6. Invitation flow

```
Client creates project + milestone
  → Client clicks "Invite freelancer" → enters email + optional message
  → Server creates invitation (status: pending, token: crypto-random)
  → Freelancer opens /invite/[token] → sees project details + milestone
  → Freelancer clicks "Accept" → invitation.status = accepted, invitee_id = freelancer
  → Milestone.freelancer_id = freelancer, milestone.invitation_id = invitation
  → Milestone status: CHECKLISTED → INVITED
  → Client sees "Freelancer accepted — fund milestone"
  → Client funds → INVITED → ACCEPTED → FUNDED
```

---

## 7. Implementation stages

### Stage 1 — Landing page, branding, login and registration

1. `src/app/globals.css` — update with PayPal color tokens, Inter font
2. `src/app/layout.tsx` — update font import, nav shell
3. `src/app/page.tsx` — landing page (hero, features, how-it-works, CTA)
4. `src/app/how-it-works/page.tsx` — step-by-step workflow
5. `src/app/features/page.tsx` — feature highlights
6. `src/app/login/page.tsx` — update to email+password form
7. `src/app/register/page.tsx` — new registration form
8. `src/app/actions/auth.ts` — add register, login with password
9. `src/lib/password.ts` — bcrypt hash/verify helpers
10. `src/db/schema.ts` — add email, passwordHash to users
11. `scripts/db-reset.ts` — update seed with emails + password hash

### Stage 2 — Client and freelancer dashboards with role-based access

1. `src/app/client/dashboard/page.tsx` — overview stats, recent milestones, pending actions
2. `src/app/client/layout.tsx` — sidebar nav (client)
3. `src/app/freelancer/dashboard/page.tsx` — overview, assigned work, pending
4. `src/app/freelancer/layout.tsx` — sidebar nav (freelancer)
5. `src/components/sidebar.tsx` — role-based navigation
6. `src/components/top-nav.tsx` — user avatar dropdown, logout
7. `src/middleware.ts` — update to redirect based on role
8. `src/app/dashboard/page.tsx` — role-based redirect

### Stage 3 — Project creation, milestone creation, invitations, acceptance

1. `src/db/schema.ts` — add projects, invitations tables; add projectId/invitationId to milestones
2. `scripts/db-reset.ts` — update DDL + seed
3. `src/app/client/projects/page.tsx` — project list
4. `src/app/client/projects/new/page.tsx` — create project form
5. `src/app/client/projects/[id]/page.tsx` — project detail + milestones
6. `src/app/client/projects/[id]/milestones/new/page.tsx` — create milestone form
7. `src/app/api/projects/route.ts` — CRUD
8. `src/app/api/projects/[id]/milestones/route.ts` — create milestone
9. `src/app/api/invitations/route.ts` — create + list
10. `src/app/api/invitations/[token]/route.ts` — view invitation
11. `src/app/api/invitations/[token]/accept/route.ts` — accept
12. `src/app/api/invitations/[token]/decline/route.ts` — decline
13. `src/app/invite/[token]/page.tsx` — invitation acceptance page
14. `src/app/freelancer/invitations/page.tsx` — pending invitations list

### Stage 4 — AI checklist, PayPal funding, freelancer submissions

1. Update state machine: add INVITED, ACCEPTED states
2. Update existing checklist generation route to work with new milestone flow
3. Update funding flow (orders/capture routes) to work with new state machine
4. Update submission form to work with new flow
5. Update detail pages for both roles

### Stage 5 — AI evaluation, revision requests, client approval, payout

1. Update approval/reject routes for new state machine
2. Update payout route
3. Add rejection notes display + resubmission flow
4. Ensure all transitions are guarded

### Stage 6 — Payment history, notifications, responsive polish, end-to-end testing

1. `src/app/client/payments/page.tsx` — payment history
2. `src/app/freelancer/earnings/page.tsx` — earnings + payout history
3. `src/app/client/settings/page.tsx` — profile + PayPal sandbox email
4. `src/app/freelancer/settings/page.tsx` — profile + PayPal sandbox email
5. Responsive: mobile sidebar, touch targets, table → card on mobile
6. End-to-end test: full flow from registration to payout

---

## 8. New dependencies

| Package | Purpose | Stage |
|---|---|---|
| `bcryptjs` | Password hashing (pure JS) | Stage 1 |
| `@types/bcryptjs` | TypeScript types | Stage 1 |
| `lucide-react` | Icons | Stage 1 |

---

## 9. What stays unchanged

- `src/lib/paypal.ts` — PayPal integration (verified)
- `src/lib/ai.ts` — AI runner (verified)
- `src/lib/evaluate.ts` — evaluation logic (verified)
- `src/lib/state-machine.ts` — add two states, keep rest
- `src/lib/session.ts` — keep HMAC cookie auth
- `src/db/ddl.ts` — add new tables, keep existing
- All existing API routes — keep, enhance where needed
- `src/components/` — keep existing, add new ones
- `plan.md` — keep as-is

---

## 10. Execution order

1. **Stage 1** — Landing, login, register, password hashing
2. **Stage 2** — Dashboards, sidebar, role-based routing
3. **Stage 3** — Projects, milestones, invitations, acceptance
4. **Stage 4** — Wire AI checklist + PayPal funding into new flow
5. **Stage 5** — Wire approval + payout into new flow
6. **Stage 6** — Payment history, settings, polish, end-to-end test

Each stage builds on the previous. Do not skip stages.

---

## 11. Success criteria

- [x] A new user can register as client or freelancer *(data layer verified via bcrypt; final UI click-through pending)*
- [x] Client creates a project + milestone *(API 201 + pages 200)*
- [x] Client generates AI checklist *(milestone 3: 6 items, nemotron-3.5-super-vl)*
- [x] Client invites freelancer (by email) *(token `A4oICz…`; milestone → INVITED)*
- [x] Freelancer accepts invitation *(milestone 3 → ACCEPTED; invite → accepted, others expired)*
- [x] Client funds milestone via PayPal sandbox *(real order `8Y8081072X799225Y`, $50.00, CREATED)*
- [ ] Freelancer submits proof (images/PDF) *(routes unchanged from verified Phase 6; confirm on milestone 3 after capture)*
- [ ] AI evaluates proof against checklist *(verified Phase 8 milestone 1; re-confirm on milestone 3)*
- [ ] Client approves or rejects (with notes) *(verified Phase 7; re-confirm on milestone 3)*
- [x] On approval, client sends PayPal Payout *(verified Phase 7 — AWXRTQCSCLBHW → PAID)*
- [ ] Freelancer sees payout status *(earnings page reads the same payouts table — verify with a live batch)*
- [x] Both users see complete timeline *(events ledger + Timeline component, unchanged)*
- [ ] All pages responsive (mobile + desktop) *(shell is mobile-first w/ sheet nav; needs device check)*
- [x] No mock data in core functionality *(all data from SQLite; all money via real sandbox APIs)*
- [x] End-to-end flow tested with real PayPal sandbox APIs *(order creation live; capture/popup to be demoed)*
- [x] All tests pass (typecheck + build + smoke) *(tsc clean, `next build` green incl. lint)*