# PRODUCTION AUDIT V1

## Date: June 15, 2026
## Deployed Build: dbe65f2
## Verified Against: Source code at commit dbe65f2

---

## CONFIRMED ISSUES (3)

### Issue 1: Day Counter Shows Day 14 (Should Be Day 15 If Inclusive)

- Displayed: "Day 14 of 180"
- Formula: `Math.max(0, Math.floor((today - June 1) / msPerDay))`
- Result: floor(14.58) = 14
- June 1 = Day 0 in current logic
- File: `src/lib/venture-config.ts` line 35
- Fix: Change to `Math.max(1, days + 1)` for inclusive counting (June 1 = Day 1)

### Issue 2: Decision Impact Scores Are Fabricated

- Displayed: "87", "54", "38", "35", "18", "15", "12", "10"
- Source: `src/lib/data/decisions.ts` impactScore field
- How Assigned: Manually estimated by Kiro during design
- Calculated: NO. blocksTasks arrays are empty on all decisions.
- File: `src/lib/data/decisions.ts`
- Fix: Set all impact scores to 0. Show "Not assessed" in UI.

### Issue 3: Two Milestone Gates Marked Met Without Verification

- Gates: "Domain purchased" and "Founder Decision Log started"
- Source: `src/lib/data/milestones.ts`
- Verified by founder: NO
- File: `src/lib/data/milestones.ts`
- Fix: Set both to met: false. Let founder toggle when confirmed.

---

## NOT ISSUES (10 items correctly working)

1. "No activity yet" on streams - CORRECT (all lastMovementAt = null)
2. 358 tasks loaded - CORRECT (verified via source file)
3. All tasks "not_started" - CORRECT (no fake completions)
4. Stale localStorage - FIXED (DATA_VERSION clears old cache)
5. Dream Protection 0/5 - CORRECT (no engagement recorded)
6. Momentum 0/100 - CORRECT (no movement on any stream)
7. Stream task counts - CORRECT (136/85/46/34/24/19/14)
8. Progress bar ~8% - CORRECT (Day 14/180)
9. Trust Report page - CORRECT (shows confidence per metric)
10. Admin Debug Panel - CORRECT (shows real counts)

---

## STREAM STATUS AFTER VERSION CLEAR

All non-grey streams calculate as RED because:
- lastMovementAt = null for all streams
- getDaysSince(null) = 999
- 999 > 14 = RED

This is TECHNICALLY CORRECT (no activity = stalled) but may be alarming for a new venture on Day 14 where many streams aren't scheduled to start until Day 21+.

Optional Fix: If stream's earliest task dayRangeStart > currentDay, show GREY not RED.

---

## EXACT FILES REQUIRING CHANGE

| File | Change | Priority |
|------|--------|----------|
| src/lib/venture-config.ts | Line 35: return Math.max(1, days + 1) | HIGH |
| src/lib/data/decisions.ts | Set all impactScore/streamsAffected/tasksAffected/estimatedDelayDays/cascadeDepth to 0 | HIGH |
| src/lib/data/milestones.ts | Set 2 unverified gates to met: false | MEDIUM |
| src/app/page.tsx | calculateStreamStatus: consider earliest task timing | LOW |

---

## PRODUCTION TRUTH

After DATA_VERSION fix deploys:
- User gets fresh data (358 tasks, null dates, no stale cache)
- Day counter: Day 14 (or Day 15 after inclusive fix)
- All streams: RED or GREY (correct for no activity)
- No impossible dates anywhere
- No fabricated completions
- Decision impact scores: STILL FABRICATED (fix #2 required)
- Milestone 2 gates: STILL UNVERIFIED (fix #3 required)
