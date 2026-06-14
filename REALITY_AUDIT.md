# SVAAS Venture OS — Reality Audit Report

## Date: June 14, 2026
## Auditor: Kiro
## Status: 24 issues found — ALL fixable without new features

---

## CRITICAL ISSUE

**Day counter shows Day 57 instead of Day ~14**

- **Cause:** Hardcoded start date `2026-04-18` (should be `2026-06-01`)
- **Locations:** 5 files (page.tsx, bottlenecks, milestones, venture-engine.ts, recalculation-engine.ts)
- **Fix:** Move to editable venture config; correct date to June 1, 2026

---

## Full Audit: Every Value Checked

| # | Field | Current Value | Source | Type | Correct Value | Fix Required |
|---|-------|---------------|--------|------|---------------|-------------|
| 1 | Venture start date | 2026-04-18 | Hardcoded (5 files) | HARDCODED | 2026-06-01 | YES — move to config |
| 2 | Launch target days | 180 | Hardcoded (2 files) | HARDCODED | 180 (probably correct) | Move to config |
| 3 | Day counter | Day 57 | Calculated from wrong start date | CALCULATED (wrong input) | ~Day 14 | Fix start date |
| 4 | Progress % | 32% | Calculated from wrong day counter | CALCULATED (wrong input) | ~8% | Fix start date |
| 5 | Momentum snapshots | Week 4-7 data | MOCK (fabricated) | MOCK | Should be empty (no history yet) | Replace with real calculation |
| 6 | Dream Protection score | 3/5 this week | MOCK (hardcoded return) | MOCK | Should calculate from actual activity | Replace with real calculation |
| 7 | Dream Protection history | [5, 4, 2, 3] | MOCK (fabricated) | MOCK | Should be empty (no history) | Replace with real calculation |
| 8 | Attention Distribution | Product:4, Packaging:2, etc. | MOCK (fabricated) | MOCK | Should calculate from actual activity | Replace with real calculation |
| 9 | Pattern insight string | "Legal & Product are both stalled..." | HARDCODED string | HARDCODED | Should be generated or empty | Make dynamic |
| 10 | Weekly Review data | weekNumber: 7, dayRange: Day 43-49 | MOCK (entire object) | MOCK | Should be weekNumber: 2 (based on real date) | Calculate from config |
| 11 | Stream: Legal lastMovementAt | null (shows 999d) | SEED placeholder | PLACEHOLDER | null is correct (no movement yet) | OK but display "No activity yet" not "999d ago" |
| 12 | Stream: Product lastMovementAt | null (shows 999d) | SEED placeholder | PLACEHOLDER | Same as above | Same fix |
| 13 | Stream: Packaging lastMovementAt | 2026-05-23 | SEED placeholder | PLACEHOLDER | Incorrect if Day 1 is June 1 | Remove (should be null) |
| 14 | Stream: Digital lastMovementAt | 2026-05-15 | SEED placeholder | PLACEHOLDER | Before Day 1 — impossible | Remove (set to null) |
| 15 | Stream: Founder lastMovementAt | 2026-06-01 | SEED placeholder | PLACEHOLDER | Approximately correct | Keep or null |
| 16 | Stream: Finance lastMovementAt | 2026-05-05 | SEED placeholder | PLACEHOLDER | Before Day 1 — impossible | Remove (set to null) |
| 17 | Task completedAt: t-1 | 2026-04-20 | SEED placeholder | PLACEHOLDER | Before Day 1 — impossible | Should be null or a date after June 1 |
| 18 | Task completedAt: t-2 | 2026-04-22 | SEED placeholder | PLACEHOLDER | Same | Same |
| 19 | Task completedAt: t-6 | 2026-04-18 | SEED placeholder | PLACEHOLDER | Same | Same |
| 20 | Task completedAt: t-50 | 2026-05-01 | SEED placeholder | PLACEHOLDER | Same | Same |
| 21 | Waiting-on due dates | 2026-06-15, 2026-06-20 | SEED placeholder | PLACEHOLDER | Plausible but unverified | Keep as placeholders, editable |
| 22 | Decision deadline: Business Structure | 2026-04-25 | SEED — was for April start | WRONG | Should be ~2026-06-08 (Day 7) | Fix based on new start date |
| 23 | Decision deadline: Launch MRP | 2026-06-15 | SEED | PLAUSIBLE | Reasonable for Day 14 | Keep |
| 24 | Milestone dayTargets | 30, 60, 105, 120, 180 | SEED from Execution Engine | CORRECT | These are relative to Day 1 | OK — calculation will be correct once start date is fixed |

---

## Summary of Fix Categories

### Category A: Wrong Start Date (5 locations)
The root cause of the Day 57 error. Fix: change to 2026-06-01 AND make configurable.

### Category B: Mock/Fabricated Data (5 functions)
Functions returning hardcoded fake data instead of calculating from real activity.
- getMomentumSnapshots() — returns fabricated week 4-7 history
- getDreamProtection() — returns hardcoded {thisWeek: 3, target: 5}
- getAttentionDistribution() — returns fabricated attention data
- patternInsight — hardcoded string
- REVIEW_DATA — entire weekly review is fabricated

### Category C: Impossible Dates (6 data records)
Seed data contains dates before the venture start date. These should be null (no activity yet) or removed.

### Category D: Should Be Configurable (3 values)
- Venture name
- Start date
- Target days

---

## Fix Plan

1. Create a venture config file that all pages read from
2. Change start date to 2026-06-01
3. Remove all mock data functions — return empty/zero when no real data exists
4. Reset impossible seed dates to null
5. Fix decision deadlines to be relative to correct start date
6. Make "days since movement" display "No activity yet" instead of large numbers

---
