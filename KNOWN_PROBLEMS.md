# KNOWN_PROBLEMS.md

## 1. Commitment Workflow Incomplete
- "Commit Today" marks task but no daily reset exists
- Multiple tasks can be committed (should be 1?)
- No mechanism to surface yesterday's uncommitted items

## 2. Done / Waiting / Blocked Gaps
- Marking "Waiting On" works but no reminder when expected date passes
- "Blocked" requires manual unblocking (no auto-detect when blocker resolves)
- "Deferred" review dates are stored but never surfaced

## 3. Navigation Confusion
- /command exists but just redirects to /today
- /bottlenecks overlaps with /warroom
- Some pages still have old 6-link nav, others have 3-link
- "More" toggle is inconsistent

## 4. Stale Data Risk
- localStorage only — if founder uses two devices, state diverges
- No conflict resolution mechanism
- Supabase would fix this but needs anon key

## 5. Decision Impact Unknown
- All impact scores are 0 (correctly zeroed, but unhelpful)
- Need task-to-task dependencies to calculate real impact
- Currently decisions show "Default: X" but no calculated downstream effect

## 6. Stream Status Static
- Home page reads seed status (red/yellow/grey)
- Should auto-calculate from task states within stream
- Today page calculates correctly; home page doesn't

## 7. No Error Handling
- If localStorage is full, app doesn't warn
- If import pipeline fails, error message is technical
- No offline indicator

## 8. DATA_VERSION = 3
- Any code change to seed data requires bumping DATA_VERSION
- This clears ALL user progress (tasks marked done, etc.)
- Need migration strategy that preserves user actions while updating task list
