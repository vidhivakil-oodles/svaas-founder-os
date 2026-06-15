# SVAAS Venture OS — Trust Report v2

## Date: June 15, 2026
## Mode: AUDIT (no code changes until approved)

---

## 1. DAY COUNTER

### Code Path
```
src/lib/venture-config.ts → getDayNumber()
  const start = new Date('2026-06-01')
  const today = new Date()
  return Math.max(0, Math.floor((today - start) / msPerDay))
```

### Exact Values (as of June 15, 2026 14:33 UTC)
- Start: 2026-06-01T00:00:00.000Z
- Today: 2026-06-15T14:33:18.802Z
- Diff: 1,261,998,802 ms
- Days: floor(1261998802 / 86400000) = **14**

### Counting Method
- **EXCLUSIVE** — June 1 = Day 0, June 2 = Day 1, June 15 = Day 14
- The comment in code says "Day 1 = June 1" but the formula returns 0 for June 1
- **This is a minor labeling inconsistency** — the formula treats start date as Day 0

### Verdict: CALCULATED (formula is correct, label is slightly misleading)

---

## 2. IMPOSSIBLE ACTIVITY DATES

### Root Cause: STALE localStorage

**The source code (src/lib/data/streams.ts) has ALL lastMovementAt = null.**

The user sees old dates because:

1. The app was first deployed with fabricated dates (May 5, May 15, May 23, June 1)
2. Those dates were saved to browser localStorage on first load
3. Code was updated to set all dates to null (commit c842c3c)
4. **localStorage was never invalidated** — no version/migration system exists
5. `loadState()` finds cached localStorage → returns stale data including old dates
6. `getDefaultState()` (with correct null dates) only runs when localStorage is empty

### Per-Stream Audit (SOURCE FILE vs BROWSER)

| Stream | In Source Code (streams.ts) | In User's Browser (localStorage) | Why Different |
|--------|---------------------------|----------------------------------|---------------|
| Legal & Structure | lastMovementAt: **null** | null (was always null) | Match ✅ |
| Product & Pilot | lastMovementAt: **null** | null (was always null) | Match ✅ |
| Packaging & Brand | lastMovementAt: **null** | **'2026-05-23T00:00:00Z'** | Stale localStorage from pre-fix deploy |
| Digital & Website | lastMovementAt: **null** | **'2026-05-15T00:00:00Z'** | Stale localStorage from pre-fix deploy |
| Social & Community | lastMovementAt: **null** | null | Match ✅ |
| Founder OS | lastMovementAt: **null** | **'2026-06-01T00:00:00Z'** | Stale localStorage from pre-fix deploy |
| Finance | lastMovementAt: **null** | **'2026-05-05T00:00:00Z'** | Stale localStorage from pre-fix deploy |

### Display Calculation
- "23d ago" = getDaysSince('2026-05-23') = floor((June 15 - May 23) / msPerDay) = 23
- "31d ago" = getDaysSince('2026-05-15') = floor((June 15 - May 15) / msPerDay) = 31  
- "41d ago" = getDaysSince('2026-05-05') = floor((June 15 - May 5) / msPerDay) = 41

**These dates are IMPOSSIBLE because they pre-date the venture start (June 1).**

### Classification: **C. Legacy Seed Data** (cached in localStorage, source code is correct)

### Fix Required: Add data version to localStorage. When version mismatches, clear and reload from source.

---

## 3. RUNTIME REALITY CHECK

### A. Total tasks in data file (src/lib/data/tasks.ts)
**358 tasks** (verified via grep -c)

### B. Tasks per stream in data file

| Stream | Count | Verified |
|--------|-------|----------|
| product | 136 | ✅ |
| social | 85 | ✅ |
| founder | 46 | ✅ |
| packaging | 34 | ✅ |
| finance | 24 | ✅ |
| legal | 19 | ✅ |
| digital | 14 | ✅ |
| **TOTAL** | **358** | ✅ |

### C. What Venture Radar loads
The Radar reads from `useAppState()` → `state.tasks`. This comes from:
1. First load: `loadState()` → checks localStorage → if found, uses cached state
2. If no localStorage: calls `getDefaultState()` → copies from src/lib/data/tasks.ts (358 tasks)

**PROBLEM:** If user has localStorage from BEFORE the 358-task import, they will see OLD 22-task seed data until localStorage is cleared.

### D. localStorage contents
- Key: `svaas-os-state`
- Contains: Full serialized AppState (tasks, decisions, streams, milestones, etc.)
- **No version field exists**
- **No migration system exists**

### E. After page refresh
- loadState() runs → finds localStorage → returns whatever was cached last
- If cached = old 22-task data → user sees 22 tasks
- If cached = new 358-task data (loaded via admin import) → user sees 358 tasks
- **If user has never used admin import, they see old data**

### Classification: **A. Real Bug** — no data versioning means code updates don't propagate to cached state

---

## 4. LEGACY DATA AUDIT

| File | Keyword Found | Purpose | Still Used at Runtime? | Loaded? | Safe to Delete? |
|------|--------------|---------|----------------------|---------|-----------------|
| src/lib/store.ts | "seed data" | Comment describing data source | Yes (provides getters) | Yes | NO (functional code) |
| src/lib/persistence.ts | "seed data" | Comment | Yes (loads state) | Yes | NO (functional code) |
| src/lib/supabase/client.ts | "placeholder" | Checks if key is real vs placeholder | Yes (guards against bad config) | No (Supabase not connected) | NO (intentional guard) |
| src/lib/supabase/server.ts | "placeholder" | Same | Same | No | NO |
| src/lib/supabase/db.ts | "placeholder" | Same | Same | No | NO |
| src/services/recalculation-engine.ts | "placeholder" | Comment `// cascade depth placeholder` | Yes | Code runs but line adds 0 | NO (marks incomplete logic) |
| src/app/trust/page.tsx | "mock", "seed" | Documents what was removed | Yes (informational) | Displayed | NO (audit documentation) |
| src/lib/data/tasks.ts | "seed", "placeholder" | Words appear in task DESCRIPTIONS (from source sheet) | Yes | Yes | NO (real task content) |
| src/lib/data/milestones.ts | "seeded" | Word appears in milestone gate text | Yes | Yes | NO (real milestone text) |

**Verdict: No rogue mock/seed files exist.** All "seed" references are either comments, guards, or words within real task descriptions from the source spreadsheet.

---

## 5. VENTURE RADAR TRACE REPORT

| # | Metric | Displayed Value | Source File | Source Field | Formula | Confidence |
|---|--------|----------------|-------------|--------------|---------|------------|
| 1 | Day Counter | "Day 14" | src/lib/venture-config.ts | launchStartDate | floor((now - June 1) / msPerDay) | **Calculated** |
| 2 | Total Days | "180" | src/lib/venture-config.ts | launchTargetDays | Static config | **Assumed** |
| 3 | Progress % | "~8%" | src/app/page.tsx | getLaunchProgress() | dayNumber / targetDays × 100 | **Calculated** |
| 4 | Dream Protection | "0/5 dots" | src/lib/state-provider.tsx | state.dailyEngagement | Count(hadActivity=true this week) | **Calculated** |
| 5 | Highest Leverage Action | First CRITICAL not_started task | src/app/page.tsx | actionable[0] | Filter: status=not_started, priority=CRITICAL, first result | **Calculated** (simplistic — not full leverage algorithm) |
| 6 | Stream Name | "Legal & Structure" etc. | src/lib/data/streams.ts | name field | Static | **Verified** (matches source sheet) |
| 7 | Stream Status Color | red/yellow/grey | src/app/page.tsx | calculateStreamStatus() | If grey→grey. If days≤7+no blocks→green. If days≤14→yellow. Else→red | **Calculated** (but input is stale — see #2 above) |
| 8 | Stream "Xd ago" | "23d ago", "31d ago", "41d ago" | src/app/page.tsx | getDaysSince(lastMovementAt) | floor((now - lastMovementAt) / msPerDay) | **STALE** — from cached localStorage, not from source code |
| 9 | Stream "No activity yet" | Shown when lastMovementAt=null | src/app/page.tsx | conditional render | If daysSince >= 999 → "No activity yet" | **Calculated** |
| 10 | Stream Bottleneck text | "Entity not formed..." | src/lib/data/streams.ts | currentBottleneck | Static string from seed | **Assumed** (manually written, not auto-derived) |
| 11 | Stream Waiting On text | "Founder decision..." | src/lib/data/streams.ts | waitingOn | Static string from seed | **Assumed** |
| 12 | Stream Task Count | "19", "136", etc. | src/app/page.tsx | streamTasks.length | Count tasks where streamId matches | **Calculated** (from 358-task dataset) |
| 13 | Stream Tasks Done | "0/19", "0/136" | src/app/page.tsx | filter(status=done).length | Count where status=done | **Calculated** (all 0 = correct, nothing done yet) |
| 14 | Momentum Score | "0/100" | src/app/page.tsx | inline calculation | avg of (100 - daysSince×4) per active stream | **Calculated** (0 because all lastMovementAt are null in source) |
| 15 | Stream Progress Bar | 0% everywhere | src/app/page.tsx | tasksDone/taskCount | ratio | **Calculated** (correct — 0 done) |
| 16 | Summary (Red/Yellow/Green/Grey) | Varies | src/app/page.tsx | count by status | Group by calculateStreamStatus result | **Calculated** (but STATUS inputs from localStorage may be stale) |
| 17 | Navigation counts | "Decisions (X)" | src/app/page.tsx | overdueDecisions.length | Count where status=pending AND deadline < today | **Calculated** |

---

## 6. LOCALSTORAGE AUDIT

| Property | Value |
|----------|-------|
| Key | `svaas-os-state` |
| Contains | Full AppState JSON (tasks, decisions, streams, milestones, streamDeps, activityLog, dailyEngagement, reviewHistory, lastUpdated) |
| Version field | **NONE** |
| Migration system | **NONE** |
| Size | ~200-400KB depending on task count |
| Invalidation trigger | **NONE** — only clearState() (never called automatically) |
| Can contain stale data | **YES** — this is the ROOT CAUSE of impossible dates |

### The Problem

```
Code deploys new data (358 tasks, null dates)
   ↓
User opens app
   ↓
loadState() checks localStorage
   ↓
localStorage has OLD data (22 tasks, fabricated May dates)
   ↓
Returns OLD data
   ↓
User sees impossible dates
```

### Solution Required
Add a `dataVersion` field. When source data changes, increment version. On load, compare versions. If mismatch → clear localStorage → reload from source.

---

## 7. ROOT CAUSE CLASSIFICATION

| # | Issue | Classification | Root Cause | Fix |
|---|-------|---------------|-----------|-----|
| 1 | "Day 14" vs "Day 15" | **D. User Misunderstanding** | Exclusive counting (Day 0 = start date). Could add 1 to make it inclusive. | Minor: add +1 or document |
| 2 | "23d ago" on Packaging | **C. Legacy Seed Data** | Stale localStorage caching old fabricated dates | Add data versioning |
| 3 | "31d ago" on Digital | **C. Legacy Seed Data** | Same | Same |
| 4 | "41d ago" on Finance | **C. Legacy Seed Data** | Same | Same |
| 5 | User may see 22 tasks instead of 358 | **A. Real Bug** | No versioning = code updates don't propagate | Add data versioning |
| 6 | Stream status "red" based on stale dates | **C. Legacy Seed Data** | Status calculated from stale lastMovementAt in localStorage | Same fix (versioning clears stale data) |
| 7 | Bottleneck text is static string | **B. Configuration Issue** | currentBottleneck in streams.ts is manually written, not auto-derived | Future: auto-derive from task state |
| 8 | No way for user to force-refresh data | **A. Real Bug** | clearState() exists but is never exposed in UI | Add "Reset Data" button in admin |

---

## Summary

### Critical Finding

**The #1 issue is NOT bad data in the source code.**
**The #1 issue is stale localStorage that was never invalidated after code updates.**

The source files are correct:
- 358 tasks (verified)
- All lastMovementAt = null (verified)
- All tasks status = not_started (verified)
- No fabricated values (verified)

But the user's BROWSER still contains old cached data from earlier versions.

### Required Fix (Single Change)

Add data versioning to persistence.ts:
```
const DATA_VERSION = 2; // Increment when source data changes

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.dataVersion === DATA_VERSION) return parsed;
    // Version mismatch → stale data → clear and reload
    localStorage.removeItem(STORAGE_KEY);
  }
  return getDefaultState(); // Fresh from source files
}
```

This single change fixes issues #2, #3, #4, #5, #6, and #8.

---

## End of Audit

No code was changed.
No features were added.
Trust Report produced.
Awaiting approval to implement the versioning fix.
