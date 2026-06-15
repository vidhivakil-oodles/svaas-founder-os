# SVAAS Venture OS — Reality Audit v2

## Date: June 15, 2026
## Auditor: Kiro
## Scope: Every metric, calculation, display value, and algorithm in the system

---

## 1. REALITY AUDIT REPORT

### Every Feature Audited

| # | Feature | Current Value | Source | Real / Assumed / Hardcoded | Useful to Decisions? | Action Required |
|---|---------|---------------|--------|---------------------------|---------------------|-----------------|
| **TIMELINE** | | | | | | |
| 1 | Venture start date | 2026-06-01 | `venture-config.ts` | **ASSUMED** — founder hasn't confirmed this is correct | Yes | Should be confirmed by founder or editable via admin |
| 2 | Day counter | ~14 (calculates from June 1) | Calculated from config | **REAL** (given assumption #1 is correct) | Yes | Correct IF start date is correct |
| 3 | 180-day timeline | 180 | `venture-config.ts` | **ASSUMED** — based on Execution Engine recommendation, not founder commitment | Yes | Should be configurable |
| 4 | Progress % | ~8% | Calculated (day/180) | **REAL** (given assumptions #1 and #3) | Partially — shows time elapsed, not work done | Consider: should this be time-based or work-based? |
| **STREAM HEALTH** | | | | | | |
| 5 | Stream status colors (red/yellow/green) | Mixed: 2 red, 4 yellow, 1 grey | Seed data — **NOT calculated** | **HARDCODED in seed** | No — not reflecting reality | Status should auto-calculate from task data on load |
| 6 | Stream currentBottleneck text | e.g., "QP not confirmed" | Seed data (static strings) | **HARDCODED** | Partially — accurate content but doesn't update when tasks change | Should auto-derive from task state |
| 7 | Stream waitingOn text | e.g., "Founder decision on LLP" | Seed data (static strings) | **HARDCODED** | Same as above | Should auto-derive or be manually editable |
| 8 | Stream nextMilestone text | e.g., "LLP formed + COI received" | Seed data (static strings) | **HARDCODED** | Partially | Should auto-derive from milestone gates |
| 9 | Stream lastMovementAt | All null (after audit fix) | Seed data | **REAL** (null = no activity — correct for fresh venture) | Yes | Correctly reflects reality |
| 10 | Stream momentumScore | All 0 | Seed data (was mocked, now zeroed) | **REAL** (0 = no activity — correct) | Yes | Correctly reflects reality |
| **MOMENTUM** | | | | | | |
| 11 | Venture momentum score | 0 | Calculated from stream scores | **REAL** — but trivially so (all streams are 0) | Not yet — no history exists | Will become useful after first actions |
| 12 | Momentum trend | "critical" (score < 25) | Calculated from score | **REAL** — mathematically correct, but misleading for Day 1 | **NO** — calling Day 14 of a new venture "critical" is wrong | Should suppress momentum warnings for first 30 days |
| 13 | Momentum snapshots history | Empty array [] | Code returns empty (mocks removed) | **REAL** — correctly empty | N/A yet | Correct |
| 14 | Momentum weights (legal=1.5, product=1.5, etc.) | Hardcoded in engine | **ARBITRARY** — designer chose these, no evidence | Questionable | Should be configurable; current weights are opinion not fact |
| **DREAM PROTECTION** | | | | | | |
| 15 | Dream Protection score | 0/5 this week | Calculated from daily engagement | **REAL** — correctly shows 0 (no activity recorded) | Not yet useful (fresh app) | Will become useful once founder starts using it |
| 16 | Dream Protection target | 5 days/week | `venture-config.ts` | **ASSUMED** — Kiro chose this, founder hasn't confirmed | Partially | Should be founder-set during onboarding |
| 17 | Dream Protection trend | "stable" (no history to compare) | Calculated | **REAL** | Yes | Correct |
| **BOTTLENECK ENGINE** | | | | | | |
| 18 | Bottleneck ranking | Based on (downstream_count × 2 + days_stuck) | Calculated | **ARBITRARY scoring formula** — the 2× multiplier is designer opinion | Partially useful | Formula is reasonable but weights are assumptions. Should be noted as heuristic not truth. |
| 19 | "Overdue" detection | Tasks past dayRangeEnd | Calculated from day counter | **REAL** — BUT only for tasks with dayRange set in seed data | Partially | Only 22 seed tasks exist; 850+ remain unimported |
| 20 | downstreamCount on tasks | Only set on task t-10 (value: 14) | Seed data — **manually assigned** | **HARDCODED ASSUMPTION** — Kiro estimated "14 tasks blocked" | Questionable | Should auto-calculate from task_dependencies table |
| 21 | isOnCriticalPath | Only set on task t-10 | Seed data — **manually assigned** | **HARDCODED ASSUMPTION** | Questionable | Should auto-calculate from dependency graph |
| **COMMAND CENTER** | | | | | | |
| 22 | Highest leverage action | QP Confirmation (t-10) | Leverage algorithm | **CALCULATED but from incomplete data** — only 22 tasks in system | Partially useful | Will be accurate once all 850 tasks are imported |
| 23 | Leverage score formula | 30% critical path + 25% downstream + 15% cross-stream + 10% momentum + 12% overdue + 8% priority + bonuses | Designed algorithm | **ENTIRELY ARBITRARY** — weights chosen by designer without evidence | Concept is useful; specific weights are unproven | Should be documented as "heuristic" and tunable |
| **DECISIONS** | | | | | | |
| 24 | Decision impact scores | 87, 54, 38, 35, 18, 15, 12, 10 | Seed data — **manually assigned** | **FABRICATED** — Kiro estimated these, they're not calculated | **NO** — system claims precision it doesn't have | Should either auto-calculate or honestly show "impact not yet assessed" |
| 25 | Decision streamsAffected | 3, 2, 2, 2, 1, 1, 1, 1 | Seed data — **manually assigned** | **FABRICATED** | Same | Same |
| 26 | Decision tasksAffected | 27, 12, 8, 9, 5, 3, 4, 2 | Seed data — **manually assigned** | **FABRICATED** | Same | Same |
| 27 | Decision estimatedDelayDays | 40, 9, 6, 0, 0, 0, 0, 0 | Seed data — **manually assigned** | **FABRICATED** (40 days is arbitrary) | Same | Same |
| 28 | Decision cascadeDepth | 4, 2, 2, 2, 1, 1, 1, 1 | Seed data — **manually assigned** | **FABRICATED** | Same | Same |
| 29 | Decision deadlines | June 8, 15, 10, 20, 25, Jul 1, Jul 15, Jul 1 | Seed data — **Kiro chose these** | **ASSUMED** — founder hasn't confirmed any deadline | Partially | These are reasonable suggestions but should be founder-set |
| 30 | Decision deferCount: Business Structure | 2 (at max) | Seed data | **FABRICATED** — implies founder already deferred twice. She didn't. | **MISLEADING** | Should be 0 (fresh start) |
| **MILESTONES** | | | | | | |
| 31 | Milestone day targets | 30, 60, 105, 120, 150, 180 | From Execution Engine (Claude) | **ASSUMED** — derived from planning, not committed to by founder | Useful as planning targets | Should note these are targets not commitments |
| 32 | Milestone gate criteria | Various | From Execution Engine (Claude) | **REASONABLE ASSUMPTIONS** — based on launch requirements analysis | Yes — well-derived | Content is good; met/not-met status is real |
| 33 | "Domain purchased" gate: met=true | Milestone ms-1 | Seed data | **UNVERIFIED** — was the domain actually purchased? | If true: correct. If not: lying. | Needs founder verification |
| 34 | "Founder Decision Log started" gate: met=true | Milestone ms-1 | Seed data | **ASSUMED** — Kiro set this based on Compendium saying log exists | Uncertain | Needs founder verification |
| 35 | Milestone status: "at_risk" for Foundation Set | ms-1 | Seed data | **REASONABLE** — Day 14 and 2/8 gates met, Day 30 target | Yes | Correctly reflects risk given assumptions |
| **DEPENDENCIES** | | | | | | |
| 36 | Stream dependency map | 9 dependencies | Seed data — **Kiro designed these** | **LOGICAL ASSUMPTIONS** — derived from Execution Engine analysis | Yes — well-reasoned | Content is sound; based on task dependencies in execution engine |
| 37 | Dependency types (hard_block vs soft_block) | Mixed | Seed data | **ARBITRARY classification** — Kiro decided which are "hard" vs "soft" | Mostly useful | Classification is reasonable but founder may disagree on some |
| 38 | Dependency strength values | 1-5 | Seed data | **ARBITRARY** — Kiro chose these numbers | Questionable — what does "strength 5" actually mean? | Either define clearly or remove |
| **WEEKLY REVIEW** | | | | | | |
| 39 | Review week number | Calculated from day/7 | Real calculation | **REAL** | Yes | Correct |
| 40 | Completed tasks list | From state (tasks with completedAt) | Real data | **REAL** | Yes | Correct |
| 41 | Stuck items | From state (blocked + overdue critical) | Real data + calculation | **REAL** | Yes | Correct |
| 42 | Suggested focus | First CRITICAL not_started task | Algorithm | **CALCULATED — simplistic** (doesn't use leverage score) | Partially | Should use leverage algorithm for consistency |
| **ATTENTION LAYER** | | | | | | |
| 43 | Attention distribution | Calculated from daily_engagement | Real data | **REAL** — but will be 0 for all streams initially | Yes (once activity exists) | Correct |
| 44 | Neglect detection | Based on days since movement | Calculated | **REAL** — but on Day 14 everything shows "no activity" which is expected | Misleading on Day 1-30 | Should suppress neglect warnings for streams not yet scheduled |
| **RECOVERY PLAYBOOK** | | | | | | |
| 45 | Recovery actions | Generated from dormant streams + decisions | Algorithm | **PARTIALLY REAL** — logic is sound but some actions are SVAAS-specific hardcoding | Mostly useful | Remove hardcoded QP task reference; make fully generic |
| 46 | "Call cousin about QP role" | Hardcoded in recovery playbook | Specific task ID 't-10' check | **HARDCODED SVAAS-specific** | Useful for SVAAS but breaks multi-venture | Must remove; make generic |
| 47 | Effort estimates ("2 minutes", "5 minutes", "30 minutes") | Hardcoded in playbook generator | **ARBITRARY** — Kiro guessed these | Questionable — is QP really a "5 minute call"? | Effort should be task metadata, not guessed |
| **TASKS** | | | | | | |
| 48 | Total task count | 22 seed tasks | Seed data (subset) | **REAL but incomplete** — 850+ exist in execution engine | Partially useful | Import full 850 for complete picture |
| 49 | Task priorities | All CRITICAL or HIGH | Seed data (only critical path tasks seeded) | **BIASED sample** — skews everything toward urgency | Distorts bottleneck/leverage calculations | Import full range including MEDIUM/LOW |
| 50 | Task day ranges | From Execution Engine | **REAL** (from Claude's analysis) | Yes | Correct source material |
| 51 | blocksTasks arrays on decisions | All empty `[]` | Seed data — **never populated** | **BROKEN** — impact calculation can't work with empty arrays | Impact scores are fabricated numbers not calculated | Either populate or remove fake impact scores |

---

## 2. CONFIGURATION AUDIT

### Values That MUST Be Configurable via Admin (Not Code)

| # | Value | Current Location | Why Configurable |
|---|-------|-----------------|-----------------|
| 1 | Venture start date | `venture-config.ts` | Founder may change Day 1 definition |
| 2 | Launch target days | `venture-config.ts` | May extend or compress timeline |
| 3 | Dream Protection target | `venture-config.ts` | Founder should set own expectation |
| 4 | Stream definitions (names, order) | `data/streams.ts` | Streams may be added/removed/renamed |
| 5 | Stream dependencies | `data/streams.ts` | Dependencies change as venture evolves |
| 6 | Milestone definitions + gates | `data/milestones.ts` | Gates may be added/modified |
| 7 | Decision options + defaults | `data/decisions.ts` | New decisions will appear |
| 8 | Decision deadlines | `data/decisions.ts` | Founder sets when decisions are due |
| 9 | Momentum weights per stream | `recalculation-engine.ts` | Importance of streams may shift |
| 10 | Leverage algorithm weights | `venture-engine.ts` | May need tuning after real use |
| 11 | Bottleneck ranking formula | `venture-engine.ts` | May need tuning |
| 12 | Neglect thresholds (7/14/21 days) | `recalculation-engine.ts` | Different ventures may have different rhythms |
| 13 | Recovery playbook effort estimates | `venture-engine.ts` | Should be per-task metadata |
| 14 | Venture name + description | `venture-config.ts` | Obviously |
| 15 | Current phase | `venture-config.ts` | Advances over time |

---

## 3. MULTI-VENTURE AUDIT

### SVAAS-Specific Logic That Breaks Multi-Venture

| # | Location | SVAAS-Specific Code | Fix Required |
|---|----------|-------------------|--------------|
| 1 | `venture-engine.ts` line ~340 | `if (stream.slug === 'legal' && d.title === 'Business Structure') return true` | Hardcoded SVAAS stream+decision pairing |
| 2 | `venture-engine.ts` line ~341 | `if (stream.slug === 'product' && d.title === 'Launch SKU Count') return true` | Same |
| 3 | `venture-engine.ts` line ~360 | `const qpTask = TASKS.find(t => t.id === 't-10')` | Hardcoded SVAAS task ID |
| 4 | `venture-config.ts` | Entire file is SVAAS-only | Should read from DB per venture |
| 5 | `recalculation-engine.ts` | Stream weight map `{legal: 1.5, product: 1.5, ...}` | Hardcoded SVAAS stream slugs |
| 6 | `venture-engine.ts` | Same weight map duplicated | Same |
| 7 | `data/streams.ts` | SVAAS streams hardcoded | Should come from DB |
| 8 | `data/tasks.ts` | SVAAS tasks hardcoded | Should come from DB |
| 9 | `data/decisions.ts` | SVAAS decisions hardcoded | Should come from DB |
| 10 | `data/milestones.ts` | SVAAS milestones hardcoded | Should come from DB |

**Verdict:** The app is currently a SVAAS-specific tool pretending to be multi-venture. The database schema supports multiple ventures, but the application code does not.

---

## 4. TECHNICAL DEBT AUDIT

| # | Debt | Severity | Impact |
|---|------|----------|--------|
| 1 | Decision `blocksTasks` arrays are empty — impact scores are fabricated | **HIGH** | System claims decisions block X tasks but can't prove it. Impact ranking may be wrong. |
| 2 | Only 22 of 850+ tasks are loaded | **HIGH** | Leverage calculator, bottleneck engine, and stream progress all work on incomplete data |
| 3 | Task `downstreamCount` and `isOnCriticalPath` are manually assigned on 1 task | **HIGH** | Leverage algorithm is biased toward t-10 because it's the only one with this data |
| 4 | Stream status colors in seed data are static — not recalculated on load | **MEDIUM** | User sees "red" even if they just completed tasks. Status should auto-compute. |
| 5 | Momentum warning fires on Day 1 ("critical") | **MEDIUM** | Creates false alarm; founder hasn't had time to build momentum |
| 6 | `TODAY` is cached as `const` at module load in venture-engine.ts | **LOW** | Won't update if serverless function is reused across days |
| 7 | No task-to-task dependency data loaded | **MEDIUM** | `task_dependencies` table exists in schema but no data uses it |
| 8 | Recovery playbook has hardcoded SVAAS references | **LOW** | Breaks if venture changes; won't work for multi-venture |
| 9 | Weekly Review "suggested focus" doesn't use leverage algorithm | **LOW** | Inconsistency — Command Center uses leverage, Review uses simple priority sort |
| 10 | Milestone "Domain purchased" and "Decision Log" marked as met without verification | **LOW** | System claims things are done that may not be |

---

## 5. RECOMMENDED FIX ORDER

### Priority 1: Data Integrity (What's LYING)

| Fix | Why First |
|-----|-----------|
| Set decision `deferCount` to 0 for Business Structure | Currently implies 2 deferrals happened. They didn't. |
| Remove fabricated impact scores OR clearly label them as "estimated" | System claims precision it doesn't have |
| Unset "Domain purchased" and "Decision Log started" milestone gates | System claims things are done without verification |
| Suppress momentum "critical" warning for Day < 30 | False alarm on a new venture |

### Priority 2: Incomplete Data (What's MISSING)

| Fix | Why Second |
|-----|------------|
| Import full 850+ tasks from Execution Engine | Every calculation is working on 22/850 = 2.6% of the data |
| Populate task-to-task dependencies | Required for real leverage/bottleneck calculation |
| Populate decision `blocksTasks` arrays | Required for real impact scoring |
| Populate `downstreamCount` from dependency graph | Required for leverage algorithm |

### Priority 3: Auto-Calculation (What's STATIC but should be DYNAMIC)

| Fix | Why Third |
|-----|-----------|
| Auto-calculate stream status on page load from task states | Remove manual red/yellow/green assignment |
| Auto-calculate stream bottleneck text from blocked/overdue tasks | Remove hardcoded bottleneck strings |
| Make impact scores calculate from `blocksTasks` + dependency graph | Remove fabricated numbers |

### Priority 4: Configuration (What's HARDCODED but should be EDITABLE)

| Fix | Why Fourth |
|-----|------------|
| Move venture config to admin-editable settings | Start date, target days, dream target |
| Make algorithm weights configurable | Momentum weights, leverage weights, neglect thresholds |
| Remove SVAAS-specific code from algorithms | QP task reference, stream slug checks |

---

## Summary: Where Reality Ends and Assumptions Begin

### What the system KNOWS (from real data):
- Which tasks exist (22 of them)
- What their status is
- When the founder takes actions (activity log)
- Which decisions exist and their options
- What the timeline structure looks like

### What the system ASSUMES (reasonable but unverified):
- Day 1 = June 1, 2026
- 180 days to launch
- Stream health colors (set manually, not computed)
- Decision deadlines
- Milestone day targets and gate criteria
- Dependency map structure

### What the system FABRICATES (presents as fact without basis):
- Decision impact scores (87, 54, 38...) — made up numbers
- "Blocks 27 tasks" — not computed from data
- "Estimated delay: 40 days" — arbitrary
- deferCount = 2 on Business Structure — implies history that didn't happen
- "Domain purchased" milestone gate = met — unverified
- QP task blocks "14 tasks" — manually assigned, not calculated

### The Core Issue

The system has **two layers of truth mixed together:**

1. **Framework logic** (algorithms, calculations, UI) — this is REAL and working
2. **Seed data** (numbers, strings, status values) — this is FABRICATED as placeholder

The framework is trustworthy. The data is not.

**Until real data is imported and impact scores are calculated rather than assigned, the system is showing accurate-looking fiction.**

---

## Closing Statement

The architecture is sound. The algorithms are reasonable. The persistence works.

But the numbers on screen are mostly made up.

The fix is not more code. The fix is:
1. Import real data (850+ tasks)
2. Build real dependency graph (task → task)
3. Calculate impact scores from the graph
4. Let the system derive truth rather than display assumptions

Until then: **the dashboard shows informed guesses, not operational reality.**
