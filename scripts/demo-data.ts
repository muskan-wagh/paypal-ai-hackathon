/**
 * Demo dataset for the ProofPay hackathon demo — shared by `npm run db:reset`
 * (full wipe + seed) and `npm run db:reseed` (wipe only demo records + seed).
 *
 * Every seeded milestone is flagged `is_demo = 1` in the database and every
 * seeded PayPal identifier (order/capture/batch ids) carries the `DEMO-`
 * prefix. NO PayPal API calls happen here — funding and payout records are
 * inserted directly as clearly-labelled samples, so demo data can never move
 * real (or even sandbox) money.
 *
 * Demo logins: maya@proofpay.dev / dana@proofpay.dev / demo1234
 */
import { inArray, like } from "drizzle-orm";
import type { Db } from "../src/db/log";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

export const DEMO_EMAIL_DOMAIN = "@proofpay.dev";
export const DEMO_PASSWORD = "demo1234";

const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;

/* ------------------------------------------------------------------ *
 * Generated "proof" screenshots (SVG) stored as real file blobs, so
 * the completed milestones show believable submission previews.
 * ------------------------------------------------------------------ */

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Browser-chrome wrapper around an app screen. */
function browserFrame(url: string, inner: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" font-family="system-ui, sans-serif">
  <rect width="1440" height="900" rx="14" fill="#e2e8f0"/>
  <rect x="8" y="8" width="1424" height="884" rx="10" fill="#ffffff"/>
  <rect x="8" y="8" width="1424" height="48" rx="10" fill="#f1f5f9"/>
  <circle cx="34" cy="32" r="7" fill="#f87171"/><circle cx="58" cy="32" r="7" fill="#fbbf24"/><circle cx="82" cy="32" r="7" fill="#34d399"/>
  <rect x="120" y="18" width="700" height="28" rx="14" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="140" y="37" font-size="13" fill="#64748b">🔒 ${esc(url)}</text>
  ${inner}
  <rect x="8" y="858" width="1424" height="34" fill="#f8fafc"/>
  <text x="24" y="880" font-size="11" fill="${accent}">✓ Rendered from live build — screenshot captured for ProofPay proof submission</text>
</svg>`;
}

/** SaaS analytics dashboard screen (Pulseboard milestones). */
function saasDashboardSvg(title: string, accent: string, dark = false): string {
  const bg = dark ? "#0f172a" : "#f8fafc";
  const panel = dark ? "#1e293b" : "#ffffff";
  const border = dark ? "#334155" : "#e2e8f0";
  const text = dark ? "#f1f5f9" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#64748b";
  const bars = [180, 240, 150, 300, 220, 340, 260, 380];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Avg"];
  const barY = 600;
  const barChart = bars
    .map((h, i) => {
      const cx = 700 + i * 62;
      return `<rect x="${cx - 20}" y="${barY - h}" width="40" height="${h}" rx="6" fill="${accent}" opacity="${(0.55 + i * 0.05).toFixed(2)}"/>
         <text x="${cx}" y="${barY + 24}" font-size="11" fill="${muted}" text-anchor="middle">${labels[i]}</text>`;
    })
    .join("");
  const plans = [
    ["Scale", "62", accent],
    ["Growth", "27", "#34d399"],
    ["Starter", "11", "#fbbf24"],
  ] as const;
  const kpis = [
    ["Active users", "12,847", "+8.2%"],
    ["MRR", "$48,210", "+5.6%"],
    ["Churn", "1.9%", "−0.4%"],
    ["Uptime", "99.98%", "SLA ok"],
  ] as const;
  const nav = ["Overview", "Revenue", "Customers", "Reports", "Settings"];
  return browserFrame(
    `https://app.pulseboard.io/${title.toLowerCase().replace(/\s+/g, "-")}`,
    `<rect x="8" y="56" width="1424" height="802" fill="${bg}"/>
  <rect x="8" y="56" width="230" height="802" fill="${dark ? "#0b1220" : "#0f172a"}"/>
  <circle cx="48" cy="100" r="12" fill="${accent}"/>
  <text x="70" y="106" font-size="16" font-weight="700" fill="#ffffff">Pulseboard</text>
  ${nav
    .map(
      (m, i) =>
        `<rect x="28" y="${150 + i * 52}" width="190" height="38" rx="8" fill="${i === 0 ? accent : "transparent"}"/>
         <text x="46" y="${174 + i * 52}" font-size="14" fill="${i === 0 ? "#ffffff" : "#94a3b8"}">${esc(m)}</text>`,
    )
    .join("")}
  <rect x="238" y="56" width="1194" height="52" fill="${panel}"/>
  <rect x="266" y="68" width="360" height="28" rx="14" fill="${bg}" stroke="${border}"/>
  <text x="284" y="87" font-size="12" fill="${muted}">Search metrics, customers…</text>
  <circle cx="1390" cy="82" r="16" fill="${accent}"/>
  <text x="266" y="150" font-size="22" font-weight="700" fill="${text}">${esc(title)}</text>
  <text x="266" y="174" font-size="13" fill="${muted}">Last 7 days · updated 2 min ago</text>
  ${kpis
    .map(
      ([label, value, delta], i) =>
        `<rect x="${266 + i * 296}" y="196" width="272" height="104" rx="10" fill="${panel}" stroke="${border}"/>
         <text x="${290 + i * 296}" y="228" font-size="12" fill="${muted}">${esc(label)}</text>
         <text x="${290 + i * 296}" y="266" font-size="26" font-weight="700" fill="${text}">${esc(value)}</text>
         <text x="${290 + i * 296}" y="288" font-size="12" fill="#10b981">${esc(delta)}</text>`,
    )
    .join("")}
  <rect x="266" y="324" width="784" height="316" rx="10" fill="${panel}" stroke="${border}"/>
  <text x="292" y="360" font-size="15" font-weight="600" fill="${text}">Daily active users</text>
  <line x1="292" y1="${barY}" x2="1024" y2="${barY}" stroke="${border}"/>
  ${barChart}
  <rect x="1074" y="324" width="358" height="316" rx="10" fill="${panel}" stroke="${border}"/>
  <text x="1098" y="360" font-size="15" font-weight="600" fill="${text}">Top plans</text>
  ${plans
    .map(
      ([plan, pct, color], i) =>
        `<text x="1098" y="${396 + i * 74}" font-size="13" fill="${text}">${esc(plan)}</text>
         <rect x="1098" y="${404 + i * 74}" width="310" height="10" rx="5" fill="${bg}"/>
         <rect x="1098" y="${404 + i * 74}" width="${Math.round(310 * (Number(pct) / 100))}" height="10" rx="5" fill="${color}"/>
         <text x="1098" y="${438 + i * 74}" font-size="12" fill="${muted}">${pct}% of accounts</text>`,
    )
    .join("")}`,
    accent,
  );
}

/** Portfolio mobile layout (responsive-portfolio milestone). */
function portfolioMobileSvg(): string {
  const checks = ["iPhone 15 Pro — 393px ✓", "Pixel 8 — 412px ✓", "Tap targets ≥ 44px ✓"];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" font-family="system-ui, sans-serif">
  <rect width="1440" height="900" fill="#e2e8f0"/>
  <rect x="500" y="28" width="440" height="844" rx="36" fill="#0f172a"/>
  <rect x="514" y="42" width="412" height="816" rx="24" fill="#ffffff"/>
  <rect x="640" y="50" width="160" height="20" rx="10" fill="#0f172a"/>
  <circle cx="716" cy="88" r="10" fill="#0070ba"/>
  <text x="734" y="93" font-size="14" font-weight="700" fill="#0f172a">ava.codes</text>
  ${[0, 1, 2, 3]
    .map(
      (i) =>
        `<rect x="538" y="${120 + i * 170}" width="364" height="150" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>
         <rect x="554" y="${136 + i * 170}" width="120" height="118" rx="10" fill="#dbeafe"/>
         <rect x="688" y="${142 + i * 170}" width="190" height="16" rx="8" fill="#0f172a" opacity="0.85"/>
         <rect x="688" y="${168 + i * 170}" width="160" height="12" rx="6" fill="#e2e8f0"/>
         <rect x="688" y="${188 + i * 170}" width="175" height="12" rx="6" fill="#e2e8f0"/>
         <rect x="688" y="${218 + i * 170}" width="86" height="24" rx="12" fill="#0070ba"/>`,
    )
    .join("")}
  <rect x="538" y="806" width="364" height="36" rx="10" fill="#0070ba"/>
  <text x="636" y="829" font-size="13" font-weight="600" fill="#ffffff">Hire me — available Q1</text>
  <rect x="980" y="360" width="380" height="180" rx="14" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="1004" y="398" font-size="15" font-weight="700" fill="#0f172a">Responsive checks</text>
  ${checks.map((l, i) => `<text x="1004" y="${432 + i * 30}" font-size="13" fill="#475569">${esc(l)}</text>`).join("")}
</svg>`;
}

/** Terminal / API response screen (REST API integration milestone). */
function terminalSvg(): string {
  const jsonLines = [
    '  "id": "pay_9f2kXwQ7Lm",',
    '  "object": "payment",',
    '  "status": "succeeded",',
    '  "amount": 480.00, "currency": "USD",',
    '  "invoice": "INV-2041",',
    '  "method": "card", "brand": "visa", "last4": "4242",',
    '  "receipt_url": "https://pay.orbitcrm.dev/r/9f2kXwQ7",',
    '  "created": 1762982400',
  ];
  const endpoints = [
    "POST /payments ✓",
    "GET /payments/:id ✓",
    "POST /refunds ✓",
    "GET /invoices ✓",
    "Webhook signature ✓",
    "Idempotency keys ✓",
  ];
  return browserFrame(
    "https://api.orbitcrm.dev/v1/payments",
    `<rect x="8" y="56" width="1424" height="802" fill="#0b1220"/>
  <text x="48" y="120" font-size="15" fill="#94a3b8" font-family="monospace">$ <tspan fill="#e2e8f0">curl -X POST https://api.orbitcrm.dev/v1/payments \</tspan></text>
  <text x="80" y="148" font-size="15" fill="#94a3b8" font-family="monospace">-H "Authorization: Bearer sk_live_***" -d '{"invoice":"INV-2041"}'</text>
  <text x="48" y="192" font-size="15" fill="#34d399" font-family="monospace">HTTP/2 200 OK · 143 ms</text>
  <text x="48" y="236" font-size="15" fill="#7dd3fc" font-family="monospace">{</text>
  ${jsonLines.map((l, i) => `<text x="72" y="${264 + i * 28}" font-size="15" fill="#e2e8f0" font-family="monospace">${esc(l)}</text>`).join("")}
  <text x="48" y="540" font-size="15" fill="#7dd3fc" font-family="monospace">}</text>
  <text x="48" y="600" font-size="15" fill="#94a3b8" font-family="monospace">$ <tspan fill="#e2e8f0">orbit invoices sync --from=orbitcrm --since=7d</tspan></text>
  <text x="48" y="632" font-size="15" fill="#34d399" font-family="monospace">✓ 42 invoices reconciled · 0 errors · webhook retries 2/2</text>
  <rect x="980" y="120" width="420" height="320" rx="12" fill="#111c33" stroke="#1e293b"/>
  <text x="1004" y="156" font-size="13" font-weight="700" fill="#7dd3fc">Endpoint coverage</text>
  ${endpoints.map((l, i) => `<text x="1004" y="${188 + i * 34}" font-size="13" fill="#cbd5e1" font-family="monospace">${esc(l)}</text>`).join("")}`,
    "#34d399",
  );
}

/* ------------------------------------------------------------------ *
 * Wipe + seed
 * ------------------------------------------------------------------ */

/** Delete every demo record: demo users (@proofpay.dev), their projects and
 * milestones with all children, plus anything flagged is_demo or carrying
 * DEMO- PayPal ids. Real (non-demo) accounts are untouched. */
export function wipeDemoData(db: Db): void {
  const demoUserIds = db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(like(schema.users.email, `%${DEMO_EMAIL_DOMAIN}`))
    .all()
    .map((u) => u.id);

  const allMilestones = db.select().from(schema.milestones).all();
  const milestoneIds = Array.from(
    new Set(
      allMilestones
        .filter(
          (m) =>
            m.isDemo === 1 ||
            (m.paypalOrderId?.startsWith("DEMO-") ?? false) ||
            (m.paypalCaptureId?.startsWith("DEMO-") ?? false) ||
            (m.clientId !== null && demoUserIds.includes(m.clientId)),
        )
        .map((m) => m.id),
    ),
  );

  if (milestoneIds.length > 0) {
    const submissionIds = db
      .select({ id: schema.submissions.id })
      .from(schema.submissions)
      .where(inArray(schema.submissions.milestoneId, milestoneIds))
      .all()
      .map((s) => s.id);
    const evaluationIds = db
      .select({ id: schema.evaluations.id })
      .from(schema.evaluations)
      .where(inArray(schema.evaluations.milestoneId, milestoneIds))
      .all()
      .map((e) => e.id);

    // Delete children before parents (better-sqlite3 enforces FKs by default).
    // order: evaluation_items → evaluations → files → submissions →
    //        checklist_items / invitations / payouts / events → milestones →
    //        projects → users
    if (evaluationIds.length > 0) {
      db.delete(schema.evaluationItems).where(inArray(schema.evaluationItems.evaluationId, evaluationIds)).run();
    }
    if (evaluationIds.length > 0) {
      db.delete(schema.evaluations).where(inArray(schema.evaluations.id, evaluationIds)).run();
    }
    if (submissionIds.length > 0) {
      db.delete(schema.files).where(inArray(schema.files.submissionId, submissionIds)).run();
    }
    if (submissionIds.length > 0) {
      db.delete(schema.submissions).where(inArray(schema.submissions.id, submissionIds)).run();
    }
    db.delete(schema.checklistItems).where(inArray(schema.checklistItems.milestoneId, milestoneIds)).run();
    db.delete(schema.invitations).where(inArray(schema.invitations.milestoneId, milestoneIds)).run();
    db.delete(schema.payouts).where(inArray(schema.payouts.milestoneId, milestoneIds)).run();
    db.delete(schema.events).where(inArray(schema.events.milestoneId, milestoneIds)).run();
    db.delete(schema.milestones).where(inArray(schema.milestones.id, milestoneIds)).run();
  }

  if (demoUserIds.length > 0) {
    db.delete(schema.projects).where(inArray(schema.projects.clientId, demoUserIds)).run();
    db.delete(schema.users).where(inArray(schema.users.id, demoUserIds)).run();
  }
}

export type SeedResult = { userIds: { maya: number; dana: number }; milestoneIds: number[] };

/**
 * Seed the full demo dataset into a schema-ready database.
 * Call wipeDemoData() first to make this idempotent.
 */
export function seedDemoData(db: Db): SeedResult {
  const now = Date.now();
  const t = (msAgo: number) => now - msAgo;
  const iso = (msFromNow: number) => new Date(now + msFromNow).toISOString().slice(0, 10);
  const payoutReceiver = process.env.PAYPAL_PAYOUT_RECEIVER?.trim() || "dana@personal.example.com";
  const aiModel = process.env.AI_MODEL?.trim() || "seed-demo";

  /* ---------------- users ---------------- */
  const insertedUsers = db
    .insert(schema.users)
    .values([
      {
        name: "Maya Chen",
        role: "client",
        email: "maya@proofpay.dev",
        passwordHash: hashPassword(DEMO_PASSWORD),
        sandboxEmail: null,
        createdAt: t(90 * day),
      },
      {
        name: "Marcus Webb",
        role: "client",
        email: "marcus@proofpay.dev",
        passwordHash: hashPassword(DEMO_PASSWORD),
        sandboxEmail: null,
        createdAt: t(60 * day),
      },
      {
        name: "Priya Sharma",
        role: "client",
        email: "priya@proofpay.dev",
        passwordHash: hashPassword(DEMO_PASSWORD),
        sandboxEmail: null,
        createdAt: t(45 * day),
      },
      {
        name: "Dana Rivera",
        role: "freelancer",
        email: "dana@proofpay.dev",
        passwordHash: hashPassword(DEMO_PASSWORD),
        sandboxEmail: payoutReceiver,
        createdAt: t(85 * day),
      },
    ])
    .returning()
    .all();
  const byName = (name: string) => insertedUsers.find((u) => u.name === name)!;
  const maya = byName("Maya Chen");
  const marcus = byName("Marcus Webb");
  const priya = byName("Priya Sharma");
  const dana = byName("Dana Rivera");

  /* ---------------- projects ---------------- */
  const projects = db
    .insert(schema.projects)
    .values([
      {
        clientId: marcus.id,
        title: "Nimbus Store — E-commerce Landing Page",
        description:
          "Rebuild the Nimbus Store marketing surface: hero, product showcase grid, and " +
          "conversion-focused CTAs. Client: Marcus Webb, founder of Nimbus Commerce.",
        createdAt: t(12 * day),
        updatedAt: t(1 * day),
      },
      {
        clientId: priya.id,
        title: "Pulseboard — SaaS Analytics Dashboard",
        description:
          "New analytics dashboard for the Pulseboard platform: KPI tiles, usage charts and " +
          "plan breakdowns. Client: Priya Sharma, Head of Product at Pulseboard.",
        createdAt: t(20 * day),
        updatedAt: t(2 * day),
      },
      {
        clientId: priya.id,
        title: "Brightlane Studio Portfolio Website",
        description:
          "Portfolio site for Brightlane Studio — case-study layout plus a responsive mobile " +
          "pass across all templates.",
        createdAt: t(16 * day),
        updatedAt: t(1 * day),
      },
      {
        clientId: maya.id,
        title: "Orbit CRM — REST API Integration",
        description:
          "Integrate the Orbit CRM payments + invoices REST API into the client portal, " +
          "including webhook handling and reconciliation.",
        createdAt: t(35 * day),
        updatedAt: t(15 * day),
      },
      {
        clientId: maya.id,
        title: "Northwind Docs — Performance Optimization",
        description:
          "Speed up the Northwind documentation portal: Lighthouse budget 90+, lazy-loading " +
          "images and caching headers.",
        createdAt: t(9 * day),
        updatedAt: t(6 * hour),
      },
    ])
    .returning()
    .all();
  const project = (title: string) => projects.find((p) => p.title.startsWith(title))!;

  /* ---------------- milestone specs ---------------- */
  type MSpec = {
    projectTitle: string;
    title: string;
    brief: string;
    amountCents: number;
    deadline: number | null;
    status: "FUNDED" | "EVALUATED" | "PAID" | "REJECTED" | "ACCEPTED" | "INVITED";
    createdAgo: number;
    updatedAgo: number;
    /** Optional overrides so submission/evaluation timestamps match their rows. */
    submitAgo?: number;
    rejectAgo?: number;
    paidAgo?: number;
    checklist: Array<{ title: string; criteria: string; type: string }>;
  };

  const specs: MSpec[] = [
    {
      projectTitle: "Nimbus Store",
      title: "Landing page hero & product showcase",
      brief:
        "Build the new Nimbus Store landing page: hero section with headline treatment and CTA, " +
        "a 3-card product showcase, and a features strip. Deliver production HTML/CSS (Tailwind) " +
        "plus a desktop screenshot. Match the Nimbus blue (#0070BA) brand palette.",
      amountCents: 65000,
      deadline: 5 * day,
      status: "FUNDED",
      createdAgo: 6 * day,
      updatedAgo: 4.5 * day,
      checklist: [
        {
          title: "Hero with headline + primary CTA",
          criteria: "Screenshot shows a hero section with headline, supporting copy and a 'Start free trial' CTA.",
          type: "visual",
        },
        {
          title: "3-card product showcase grid",
          criteria: "Exactly three product cards with image placeholder, title and price line.",
          type: "visual",
        },
        {
          title: "Brand palette match",
          criteria: "Primary blue matches #0070BA and typography uses the Inter stack.",
          type: "quality",
        },
      ],
    },
    {
      projectTitle: "Pulseboard",
      title: "Analytics charts & KPI tiles",
      brief:
        "Implement the analytics view of Pulseboard: four KPI tiles (active users, MRR, churn, " +
        "uptime), a 7-day daily-active-users bar chart, and a top-plans breakdown panel. " +
        "Data comes from the existing /metrics endpoint — wire it up with the React Query hooks.",
      amountCents: 90000,
      deadline: 12 * day,
      status: "FUNDED",
      createdAgo: 8 * day,
      updatedAgo: 6.5 * day,
      checklist: [
        {
          title: "Four KPI tiles render live data",
          criteria: "Active users, MRR, churn and uptime tiles show values from the /metrics endpoint.",
          type: "scope",
        },
        {
          title: "7-day bar chart with weekday labels",
          criteria: "Bar chart shows eight data points with Mon–Sun labels.",
          type: "visual",
        },
        {
          title: "Top-plans breakdown panel",
          criteria: "Panel lists Scale/Growth/Starter with proportional bars.",
          type: "visual",
        },
        {
          title: "Loading + error states handled",
          criteria: "Skeletons show while loading and an inline error banner on fetch failure.",
          type: "quality",
        },
      ],
    },
    {
      projectTitle: "Pulseboard",
      title: "Dashboard UI implementation (design system)",
      brief:
        "Implement the full Pulseboard dashboard UI against the new design system: sidebar " +
        "navigation, top bar with search, KPI row, chart and table panels. Light theme first; " +
        "dark theme tokens included. This is the milestone the client will review this week.",
      amountCents: 120000,
      deadline: 3 * day,
      status: "EVALUATED",
      createdAgo: 12 * day,
      updatedAgo: 2 * day,
      submitAgo: 2 * day,
      checklist: [
        {
          title: "Sidebar nav + top bar implemented",
          criteria: "Screenshot shows collapsible sidebar with five nav items and a search field in the top bar.",
          type: "visual",
        },
        {
          title: "KPI row with four metrics",
          criteria: "Four metric cards with label, value and delta indicator.",
          type: "visual",
        },
        {
          title: "Chart + table panels present",
          criteria: "A chart panel and a data table panel exist on the same grid.",
          type: "scope",
        },
        {
          title: "Dark theme tokens defined",
          criteria: "Design tokens file includes dark-theme color variables.",
          type: "document",
        },
      ],
    },
    {
      projectTitle: "Orbit CRM",
      title: "Payments & invoices REST integration",
      brief:
        "Integrate Orbit CRM's payments and invoices REST API: auth via bearer token, " +
        "POST /payments with idempotency keys, GET /invoices sync, and webhook signature " +
        "verification. Deliver integration notes plus a terminal capture of a successful call. " +
        "This milestone was delivered, approved and paid out — a complete ProofPay example.",
      amountCents: 180000,
      deadline: -18 * day,
      status: "PAID",
      createdAgo: 24 * day,
      updatedAgo: 15 * day,
      submitAgo: 19 * day,
      paidAgo: 15 * day,
      checklist: [
        {
          title: "POST /payments with idempotency key",
          criteria: "Integration notes show an Idempotency-Key header on payment creation.",
          type: "document",
        },
        {
          title: "Successful payment response captured",
          criteria: "Terminal screenshot shows HTTP 200 with status 'succeeded'.",
          type: "visual",
        },
        {
          title: "Webhook signature verified",
          criteria: "Code path verifies the Orbit-CRM-Signature header before accepting events.",
          type: "scope",
        },
        {
          title: "Invoice sync job runs without errors",
          criteria: "Log output shows 0 errors across the 7-day reconciliation run.",
          type: "quality",
        },
      ],
    },
    {
      projectTitle: "Brightlane Studio",
      title: "Responsive portfolio — mobile pass",
      brief:
        "Complete the mobile responsiveness pass for the Brightlane portfolio: stacked project " +
        "cards, sticky CTA, and 44px minimum tap targets across the templates.",
      amountCents: 48000,
      deadline: 2 * day,
      status: "REJECTED",
      createdAgo: 9 * day,
      updatedAgo: 1 * day,
      submitAgo: 4 * day,
      rejectAgo: 1 * day,
      checklist: [
        {
          title: "Project cards stack on mobile",
          criteria: "Mobile screenshot shows cards stacked full-width with 16px gutters.",
          type: "visual",
        },
        {
          title: "Sticky 'Hire me' CTA present",
          criteria: "A sticky bottom CTA bar is visible on the mobile layout.",
          type: "scope",
        },
        {
          title: "Tap targets ≥ 44px",
          criteria: "All interactive elements meet the 44px minimum touch target.",
          type: "quality",
        },
      ],
    },
    {
      projectTitle: "Northwind Docs",
      title: "Lighthouse performance budget",
      brief:
        "Raise the docs portal's Lighthouse performance score to 90+ on mobile: defer " +
        "non-critical scripts, add width/height to images, and enable long-term caching for " +
        "static assets.",
      amountCents: 75000,
      deadline: 14 * day,
      status: "ACCEPTED",
      createdAgo: 5 * day,
      updatedAgo: 4 * day,
      checklist: [
        {
          title: "Lighthouse performance ≥ 90 (mobile)",
          criteria: "Lighthouse report screenshot shows performance score 90 or above.",
          type: "document",
        },
        {
          title: "Images have explicit dimensions",
          criteria: "No layout shifts — CLS below 0.05 in the field data.",
          type: "quality",
        },
        {
          title: "Static assets cached 1 year",
          criteria: "Cache-Control header on /assets/* is max-age=31536000, immutable.",
          type: "scope",
        },
      ],
    },
    {
      projectTitle: "Northwind Docs",
      title: "Image lazy-loading & caching headers",
      brief:
        "Second performance milestone: add native lazy-loading to all article images and ship " +
        "the immutable cache-header policy for the asset pipeline.",
      amountCents: 60000,
      deadline: 20 * day,
      status: "INVITED", // pending invitation — Dana hasn't accepted yet
      createdAgo: 2 * day,
      updatedAgo: 2 * day - 5 * hour,
      checklist: [
        {
          title: "Native lazy-loading on article images",
          criteria: "All <img> tags below the fold carry loading=\"lazy\".",
          type: "scope",
        },
        {
          title: "No CLS regression",
          criteria: "CLS stays below 0.05 after the change.",
          type: "quality",
        },
      ],
    },
  ];

  /* ---------------- milestones + checklists ---------------- */
  const idOf = new Map<string, number>();
  for (const spec of specs) {
    const proj = project(spec.projectTitle);
    const invited = spec.status === "INVITED";
    const escrowed = ["FUNDED", "SUBMITTED", "EVALUATED", "APPROVED", "REJECTED", "PAID"].includes(spec.status);
    const slug = spec.title.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 8).toUpperCase();
    const ms = db
      .insert(schema.milestones)
      .values({
        clientId: proj.clientId,
        freelancerId: invited ? null : dana.id,
        projectId: proj.id,
        title: spec.title,
        brief: spec.brief,
        amountCents: spec.amountCents,
        currency: "USD",
        deadline: spec.deadline === null ? null : iso(spec.deadline),
        status: spec.status,
        isDemo: 1,
        paypalOrderId: escrowed || spec.status === "PAID" ? `DEMO-ORDER-${slug}` : null,
        paypalCaptureId: escrowed ? `DEMO-CAPTURE-${slug}` : null,
        createdAt: t(spec.createdAgo),
        updatedAt: t(spec.updatedAgo),
      })
      .returning()
      .get();
    idOf.set(spec.title, ms.id);

    spec.checklist.forEach((item, index) => {
      db.insert(schema.checklistItems)
        .values({
          milestoneId: ms.id,
          title: item.title,
          acceptanceCriteria: item.criteria,
          checkType: item.type,
          sortOrder: index,
          createdAt: t(spec.createdAgo + 2 * hour),
        })
        .run();
    });
  }

  const clientName = new Map([
    [maya.id, maya.name],
    [marcus.id, marcus.name],
    [priya.id, priya.name],
  ]);
  const clientOf = new Map(specs.map((s) => [s.title, project(s.projectTitle).clientId]));

  /* ---------------- event ledger ---------------- */
  const addEvent = (
    milestoneTitle: string,
    type: string,
    actor: string,
    createdAt: number,
    payload: Record<string, unknown> = {},
  ) => {
    db.insert(schema.events)
      .values({
        milestoneId: idOf.get(milestoneTitle)!,
        type,
        actor,
        payloadJson: JSON.stringify(payload),
        createdAt,
      })
      .run();
  };

  type Through = "INVITED" | "ACCEPTED" | "FUNDED" | "EVALUATED" | "REJECTED";
  const throughFor = (status: MSpec["status"]): Through => {
    if (status === "INVITED") return "INVITED";
    if (status === "ACCEPTED") return "ACCEPTED";
    if (status === "FUNDED") return "FUNDED";
    if (status === "REJECTED") return "REJECTED";
    return "EVALUATED"; // EVALUATED and PAID share the chain; PAID gets extra events
  };

  for (const spec of specs) {
    const through = throughFor(spec.status);
    const cName = clientName.get(clientOf.get(spec.title)!)!;
    // Later flow steps happen CLOSER to now, hence the subtractive offsets.
    const submitAgo = spec.submitAgo ?? spec.createdAgo - 5 * day;
    const evalAgo = submitAgo - hour;
    addEvent(spec.title, "DRAFT_CREATED", cName, t(spec.createdAgo), { amountCents: spec.amountCents, demo: true });
    addEvent(spec.title, "CHECKLIST_CREATED", "ai", t(spec.createdAgo - 2 * hour), {
      model: aiModel,
      items: spec.checklist.length,
      demo: true,
    });
    addEvent(spec.title, "INVITED", cName, t(spec.createdAgo - 5 * hour), {
      invitee: "Dana Rivera",
      ...(through === "INVITED" ? { demo: true } : {}),
    });
    if (through === "INVITED") continue;
    addEvent(spec.title, "ACCEPTED", "Dana Rivera", t(spec.createdAgo - 1 * day), {});
    if (through === "ACCEPTED") continue;
    addEvent(spec.title, "FUNDED", cName, t(spec.createdAgo - 1.5 * day), {
      amountCents: spec.amountCents,
      demoOrderId: `DEMO-ORDER-${spec.title.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 8).toUpperCase()}`,
      demo: true,
    });
    if (through === "FUNDED") continue;
    addEvent(spec.title, "SUBMITTED", "Dana Rivera", t(submitAgo), { files: 1 });
    if (through === "REJECTED") {
      addEvent(spec.title, "EVALUATED", "ai", t(evalAgo), {
        verdict: "fail",
        score: 68,
        demo: true,
      });
      addEvent(spec.title, "REJECTED", cName, t(spec.rejectAgo ?? spec.createdAgo - 8 * day), {
        notes:
          "Looks close, but two things before I approve:\n" +
          "1. The sticky 'Hire me' CTA is missing on the case-study template.\n" +
          "2. Card gutters are 12px — the spec asks for 16px.\n" +
          "Resubmit with a fresh mobile screenshot and I'll approve same-day.",
        demo: true,
      });
      continue;
    }
    addEvent(spec.title, "EVALUATED", "ai", t(evalAgo), {
      verdict: spec.status === "PAID" ? "pass" : "partial",
      score: spec.status === "PAID" ? 96 : 88,
      demo: true,
    });
    if (spec.status === "PAID") {
      const paidAgo = spec.paidAgo ?? spec.createdAgo - 9 * day;
      addEvent(spec.title, "APPROVED", cName, t(paidAgo), { demo: true });
      addEvent(spec.title, "PAID", cName, t(paidAgo - hour), {
        batchId: "DEMO-BATCH-PP001",
        status: "SUCCESS",
        demo: true,
      });
    }
  }

  /* ---------------- pending invitation ---------------- */
  const invitedSpec = specs.find((s) => s.status === "INVITED")!;
  const token = Buffer.from(`demo-invite-${idOf.get(invitedSpec.title)}`).toString("base64url");
  db.insert(schema.invitations)
    .values({
      milestoneId: idOf.get(invitedSpec.title)!,
      inviterId: clientOf.get(invitedSpec.title)!,
      inviteeEmail: "dana@proofpay.dev",
      inviteeId: null,
      token,
      status: "pending",
      message: "Saw your Pulseboard work — can you take the lazy-loading milestone too?",
      createdAt: t(6 * hour),
      expiresAt: now + 7 * day,
    })
    .run();

  /* ---------------- submissions + proof files ---------------- */
  const insertFile = (submissionId: number, filename: string, svg: string, mime = "image/svg+xml", ago = 2 * day) => {
    db.insert(schema.files)
      .values({
        submissionId,
        filename,
        mimeType: mime,
        sizeBytes: Buffer.byteLength(svg),
        data: Buffer.from(svg),
        createdAt: t(ago),
      })
      .run();
  };

  // 1) EVALUATED milestone (dashboard UI) — light + dark screenshots
  const evaluatedId = idOf.get(specs[2].title)!;
  const evalSubmissionId = db
    .insert(schema.submissions)
    .values({
      milestoneId: evaluatedId,
      freelancerId: dana.id,
      note:
        "Dashboard UI implemented against the design system. Sidebar collapses under 1024px. " +
        "Dark tokens are in tokens.dark.css — one screenshot attached per theme.",
      createdAt: t(2 * day),
    })
    .returning()
    .get();
  insertFile(evalSubmissionId.id, "pulseboard-dashboard-light.svg", saasDashboardSvg("Analytics Overview", "#0070ba", false));
  insertFile(evalSubmissionId.id, "pulseboard-dashboard-dark.svg", saasDashboardSvg("Analytics Overview", "#38bdf8", true));

  // 2) PAID milestone (REST integration) — terminal capture
  const paidId = idOf.get(specs[3].title)!;
  const paidSubmissionId = db
    .insert(schema.submissions)
    .values({
      milestoneId: paidId,
      freelancerId: dana.id,
      note:
        "Integration complete. Bearer auth + idempotency keys on POST /payments, webhook " +
        "signature verified, and the 7-day invoice sync ran clean: 42 invoices, 0 errors.",
      createdAt: t(19 * day),
    })
    .returning()
    .get();
  insertFile(paidSubmissionId.id, "orbit-payments-integration-proof.svg", terminalSvg(), "image/svg+xml", 19 * day);

  // 3) REJECTED milestone — first (rejected) submission
  const rejectedId = idOf.get(specs[4].title)!;
  const rejectedSubmissionId = db
    .insert(schema.submissions)
    .values({
      milestoneId: rejectedId,
      freelancerId: dana.id,
      note: "Mobile pass v1 — cards stack, CTA bar added. Gutters are 12px, felt tight but shipped.",
      createdAt: t(4 * day),
    })
    .returning()
    .get();
  insertFile(rejectedSubmissionId.id, "brightlane-portfolio-mobile-v1.svg", portfolioMobileSvg(), "image/svg+xml", 4 * day);

  /* ---------------- evaluations ---------------- */
  const checklistFor = (milestoneId: number) =>
    db
      .select()
      .from(schema.checklistItems)
      .all()
      .filter((c) => c.milestoneId === milestoneId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  // EVALUATED milestone: 3 pass + 1 partial → verdict partial, score 88
  const evalChecklist = checklistFor(evaluatedId);
  const evalItemVerdicts: Array<["pass" | "partial" | "fail", string]> = [
    ["pass", "Sidebar with five nav items and a top-bar search field are clearly visible in both screenshots."],
    ["pass", "All four KPI cards (Active users, MRR, Churn, Uptime) are present with values and deltas."],
    ["pass", "Chart panel and data table panel share the same grid below the KPI row."],
    [
      "partial",
      "tokens.dark.css was referenced in the note but only the light screenshot was visually confirmed; the dark tokens are plausible but not fully verifiable from the proof alone.",
    ],
  ];
  const evalId = db
    .insert(schema.evaluations)
    .values({
      milestoneId: evaluatedId,
      submissionId: evalSubmissionId.id,
      verdict: "partial",
      score: 88,
      summary:
        "Strong submission overall: sidebar, KPI row and panels all match the brief. The dark-theme " +
        "checklist item is only partially verifiable from the submitted proof — confirm the dark tokens " +
        "screenshot or approve as-is if you trust the code path.",
      model: aiModel,
      rawJson: JSON.stringify({
        demo: true,
        model: aiModel,
        score: 88,
        items: evalItemVerdicts.map(([v]) => v),
      }),
      createdAt: t(2 * day - hour),
    })
    .returning()
    .get();
  evalItemVerdicts.forEach(([verdict, explanation], i) => {
    db.insert(schema.evaluationItems)
      .values({ evaluationId: evalId.id, checklistItemId: evalChecklist[i].id, verdict, explanation })
      .run();
  });

  // REJECTED milestone: 1 pass + 2 fail → verdict fail, score 68 (client rejected)
  const rejChecklist = checklistFor(rejectedId);
  const rejItemVerdicts: Array<["pass" | "partial" | "fail", string]> = [
    ["pass", "Project cards stack full-width with visible gutters on the 393px viewport screenshot."],
    ["fail", "No sticky 'Hire me' CTA bar is visible on the case-study template screenshot."],
    ["fail", "Measured gutters are 12px; the acceptance criteria require 16px gutters and fully met 44px tap targets."],
  ];
  const rejId = db
    .insert(schema.evaluations)
    .values({
      milestoneId: rejectedId,
      submissionId: rejectedSubmissionId.id,
      verdict: "fail",
      score: 68,
      summary:
        "Card stacking works, but the sticky CTA is missing and the 16px gutter requirement is not met. " +
        "Recommended: request revisions.",
      model: aiModel,
      rawJson: JSON.stringify({ demo: true, model: aiModel, score: 68 }),
      createdAt: t(4 * day - hour),
    })
    .returning()
    .get();
  rejItemVerdicts.forEach(([verdict, explanation], i) => {
    db.insert(schema.evaluationItems)
      .values({ evaluationId: rejId.id, checklistItemId: rejChecklist[i].id, verdict, explanation })
      .run();
  });

  // PAID milestone: full-pass evaluation (the complete showcase example)
  const paidChecklist = checklistFor(paidId);
  const paidItemVerdicts: Array<["pass" | "partial" | "fail", string]> = [
    ["pass", "Integration notes document the Idempotency-Key header on every POST /payments call."],
    ["pass", "Terminal capture shows HTTP 200 with \"status\": \"succeeded\" and a receipt URL."],
    ["pass", "Webhook handler verifies the Orbit-CRM-Signature HMAC before processing events."],
    ["pass", "Sync log shows 42 invoices reconciled with 0 errors and 2 successful webhook retries."],
  ];
  const paidEvalId = db
    .insert(schema.evaluations)
    .values({
      milestoneId: paidId,
      submissionId: paidSubmissionId.id,
      verdict: "pass",
      score: 96,
      summary:
        "Complete, well-evidenced integration: all four acceptance criteria are satisfied. The " +
        "terminal capture directly demonstrates a successful payment and the notes cover " +
        "idempotency, webhook verification and error-free reconciliation.",
      model: aiModel,
      rawJson: JSON.stringify({ demo: true, model: aiModel, score: 96 }),
      createdAt: t(19 * day - hour),
    })
    .returning()
    .get();
  paidItemVerdicts.forEach(([verdict, explanation], i) => {
    db.insert(schema.evaluationItems)
      .values({ evaluationId: paidEvalId.id, checklistItemId: paidChecklist[i].id, verdict, explanation })
      .run();
  });

  /* ---------------- demo payout (sample transaction) ---------------- */
  db.insert(schema.payouts)
    .values({
      milestoneId: paidId,
      batchId: "DEMO-BATCH-PP001",
      status: "SUCCESS",
      receiver: payoutReceiver,
      amountCents: specs[3].amountCents,
      rawJson: JSON.stringify({
        demo: true,
        note: "Seeded sample payout — no PayPal API call was made for this record.",
        batch_header: {
          payout_batch_id: "DEMO-BATCH-PP001",
          batch_status: "SUCCESS",
          amount: { currency: "USD", value: "1800.00" },
        },
        items: [
          {
            payout_item_id: "DEMO-ITEM-PP001",
            payout_item_status: "SUCCESS",
            receiver: payoutReceiver,
            amount: { currency: "USD", value: "1800.00" },
          },
        ],
      }),
      createdAt: t(15 * day),
      updatedAt: t(15 * day),
    })
    .run();

  return { userIds: { maya: maya.id, dana: dana.id }, milestoneIds: [...idOf.values()] };
}
