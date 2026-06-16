# PROJECT_BRAIN.md
# SVAAS Founder OS — Single Source of Truth for All Future Sessions

---

## 1. Venture Context

**What SVAAS is:**
Premium botanical wellness brand. "Beauty Inside Out." Ritual Wellness. Handmade in Chennai.
Hero product: Svaaskriti — 51+ ingredient hair oil. "Food For Hair."

**Current phase:** P0 (Foundation)
**Launch target:** 180 days from June 1, 2026 (Day 1)
**Today:** ~Day 15

**Founder:** Vidhi Vakil
- Strengths: Vision, brand building, opportunity spotting, creativity
- Risks: Priority diffusion, too many parallel ideas, loses momentum when progress invisible

**Founder assumptions (not yet verified):**
- Start date: June 1, 2026
- Launch target: 180 days
- 3 SKUs at launch (oil + 2 bath salts)
- LLP structure preferred
- MRP ₹599 (default, not confirmed)
- QP = cousin (conversation not yet had)

---

## 2. Product Vision

**What Founder OS is:**
A Chief of Staff for the founder. Not a dashboard. Not project management.

**Core question the app answers:**
"What should I do next?"

**Every card on every screen must answer:**
1. What? (clear action)
2. Why? (context)
3. What happens if I don't? (consequence)
4. One click to resolve (button)

**Target behavior:**
A founder opens this before WhatsApp, before email, before Slack.
Understands their day in under 30 seconds.
Keeps using it for 365 days because it helps them win.

---

## 3. Architecture

### Data Flow
```
Google Sheet (SVAAS Execution Engine)
  → /api/import-pipeline (CSV fetch + transform)
  → 358 tasks (TypeScript in src/lib/data/tasks.ts)
  → localStorage (client-side persistence with DATA_VERSION)
  → StateProvider (React Context)
  → UI (all pages read from useAppState())
```

### Pages (14 routes)
| Route | Purpose | Status |
|-------|---------|--------|
| `/` | CEO Brief — 5 actionable cards | Active |
| `/today` | Top 3 actions + commitment loop + consequences + wins | Active |
| `/decisions` | Decision Engine — ranked, one-click resolve | Active |
| `/review` | Weekly Review — 7-step guided flow | Active |
| `/warroom` | Emergency only — overdue, blocked, critical decisions | Active |
| `/milestones` | Gate criteria progress | Active |
| `/stream/[slug]` | Per-stream drill-down | Active |
| `/dependencies` | Cross-stream cascade view | Active |
| `/bottlenecks` | Auto-detected issues ranked | Active |
| `/admin` | Data import, debug panel, reset | Active |
| `/trust` | Trust Report — source/formula/confidence per metric | Active |
| `/command` | Redirects → /today | Deprecated |
| `/api/import-pipeline` | Google Sheet → JSON transform | API |
| `/api/import` | Generic CSV/JSON import | API |

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/venture-config.ts` | Start date, target days, phase — single config source |
| `src/lib/persistence.ts` | localStorage with DATA_VERSION (v3) |
| `src/lib/state-provider.tsx` | React Context with all mutations |
| `src/lib/data/tasks.ts` | 358 imported tasks from Execution Engine |
| `src/lib/data/decisions.ts` | 8 launch decisions |
| `src/lib/data/streams.ts` | 7 venture streams + 9 dependencies |
| `src/lib/data/milestones.ts` | 6 milestones with gate criteria |
| `supabase/schema.sql` | Full 14-table schema (multi-venture) |
| `supabase/seed.sql` | SVAAS as Venture #1 |

### Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- localStorage (current persistence)
- Supabase (schema ready, not yet connected — needs anon key)
- Vercel (auto-deploys from GitHub)

---

## 4. Completed Work

| Commit | Milestone |
|--------|-----------|
| `82a94a7` | Initial Next.js setup |
| `2a1daa7` | Complete founder execution system (8 screens) |
| `1cb248c` | Supabase schema (multi-venture, 14 tables, RLS) |
| `fc0e818` | Persistence layer, server actions, import API |
| `d88ef09` | Recalculation engine, admin UI |
| `6944eeb` | Client-side persistence with localStorage |
| `02359b0` | Supabase CRUD layer + seed data |
| `8db2493` | All pages converted to client components |
| `c842c3c` | Reality Audit — correct start date, remove mocks |
| `00c88d6` | Import Pipeline + Trust Report |
| `5b4c01a` | Import all 358 tasks from Google Sheets |
| `84ebacb` | Trust Report v2 |
| `dbe65f2` | DATA_VERSION fix (invalidates stale localStorage) |
| `6d81ec3` | Production Audit v1 |
| `c6da0d7` | TODAY page + production fixes (inclusive day counting) |
| `dc82c0a` | CEO Brief, Decision Engine, Timeline, Momentum |
| `e49af79` | Phase 4: Commitment Loop, Consequences, Wins, War Room |
| `58228ff` | Make every card actionable |

---

## 5. Open Problems

| # | Problem | Severity | Notes |
|---|---------|----------|-------|
| 1 | Supabase not connected (needs anon key) | MEDIUM | App works fine with localStorage. Multi-device sync blocked. |
| 2 | No task-to-task dependencies | MEDIUM | Can't calculate true downstream impact. Stream deps exist. |
| 3 | Decision impact scores are 0 (zeroed, not calculated) | LOW | Requires task deps to calculate properly. |
| 4 | Stream status colors still from seed (not auto-calculated on Home) | LOW | Today page calculates correctly. Home reads seed. |
| 5 | Stream detail shows all tasks (should show top 10) | LOW | Planned in Phase 4 but not yet implemented. |
| 6 | No real "Founder Score" (weekly 0-100) | LOW | Designed but not built. |
| 7 | localStorage only — no multi-device sync | MEDIUM | Supabase connection fixes this. |

---

## 6. Product Principles

1. **Trust over completeness.** Never display a number you can't trace to source.
2. **Action over analytics.** Every screen answers "What do I do next?" not "What data do I have?"
3. **Founder behavior over dashboards.** Design for daily return, not one-time setup.
4. **30-second rule.** Every screen understandable in under 30 seconds.
5. **Every card answers:** What? Why? Consequence? Action?
6. **Reality over theory.** If a metric is fabricated, show "Unknown" instead.
7. **Consequences visible.** "If you don't do this, X gets delayed."
8. **No dead metrics.** Hide anything showing zero until it has real data.
9. **Momentum through wins.** Celebrate completions. Founders need evidence of progress.
10. **One source of truth.** Google Sheet → Pipeline → App. Not manual TypeScript.

---

## 7. Current Backlog (Active Only)

| # | Item | Priority | Effort |
|---|------|----------|--------|
| 1 | Connect Supabase (anon key needed from founder) | P1 | 2h |
| 2 | Stream detail: show only top 10 actionable, collapse rest | P1 | 30m |
| 3 | Founder Score (weekly 0-100) | P2 | 1h |
| 4 | Build task-to-task dependency data | P2 | 3h |
| 5 | Auto-calculate stream status from task states | P2 | 1h |
| 6 | Calculate decision impact from actual blocksTasks | P2 | 1h |
| 7 | Add "If you don't..." to /today actions | P1 | Done in Phase 4 ✓ |

---

## 8. Next Session Startup Prompt

```
Continue SVAAS Founder OS.
Repository: vidhivakil-oodles/svaas-founder-os
Branch: main
Deployed: svaas-founder-os.vercel.app

Read PROJECT_BRAIN.md first for full context.

Current state:
- 358 real tasks imported from Google Sheets
- 19 commits, all pushed
- Vercel auto-deploying
- localStorage persistence with DATA_VERSION=3
- Every card on home page is actionable
- War Room, Today, Decisions, Review all working
- Supabase schema ready but not connected (needs anon key)

Product principles:
- Chief of Staff, not dashboard
- Every card: What? Why? Consequence? Action?
- 30-second comprehension
- Trust over fabrication

Do NOT: add dashboards, add metrics, add audits, fabricate data
DO: make existing features better, connect Supabase when key available, improve actionability
```

---

## 9. Do Not Do List

Things explicitly rejected during development:

- Spreadsheet dashboards (killed in Phase 2)
- Vanity metrics ("0/358 completed" removed)
- Fabricated scores (impact scores zeroed, leverage scores removed)
- Fake momentum (mock data removed, shows "Start your streak" when empty)
- Duplicate pages (/command redirects to /today)
- Excessive navigation (reduced to Today/Decisions/Review + More toggle)
- Analytics dashboards (no charts, no graphs)
- Gamification (no badges, no levels)
- AI predictions (not trustworthy without data)
- More audit reports (audit phase is complete)
- More roadmap documents (build phase only)
- Team collaboration features (single founder)
- Notification systems (premature)
- Calendar integrations (premature)
- Content calendars (not the app's job)
- CRM features (not the app's job)
- Financial dashboards (use Zoho Books)

---

## End of PROJECT_BRAIN.md
