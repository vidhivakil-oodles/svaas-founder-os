# PROJECT_BRAIN.md
# SVAAS Founder OS — The Brain

## What This Is

A Founder Operating System for Vidhi Vakil to launch SVAAS, a premium botanical wellness brand.

## Why It Exists

Vidhi has vision, creativity, and brand instinct. She does NOT have a system that tells her what to do today, why it matters, and what breaks if she doesn't.

The app exists to prevent the historical pattern: SVAAS going dormant because founder attention drifts elsewhere.

## What Problem It Solves

The founder wakes up and within 30 seconds knows:
1. What is blocking SVAAS (bottleneck)
2. What decision needs to be made (with one-click resolve)
3. Who she needs to talk to (conversation)
4. What single task moves the needle (with consequence of inaction)
5. What opportunity is within reach (milestone progress)

## What Success Looks Like

- Founder opens this before WhatsApp every morning
- Founder uses it daily for 365 days
- SVAAS reaches public launch within 180 days
- Zero "I don't know what to do next" moments
- Decisions made in days, not weeks

## Architecture Summary

Google Sheet → Import Pipeline → 358 Tasks → localStorage → StateProvider → UI

Task States: not_started → committed_today → in_progress → waiting_on / blocked / deferred → done

Pages: / (CEO Brief), /today (Execute), /decisions, /warroom, /review, /milestones, /stream/[slug], /admin, /trust

## Key Commits

- `82a94a7` Initial setup
- `5b4c01a` Full 358-task import
- `dbe65f2` DATA_VERSION fix
- `c6da0d7` TODAY page + fixes
- `dc82c0a` CEO Brief + Decision Engine
- `e49af79` War Room + Commitment Loop
- `58228ff` Make every card actionable
- `03ad0a6` Task State Engine (7 states)

## Do Not Do

- Spreadsheet dashboards
- Vanity metrics
- Fabricated scores
- Duplicate pages
- Charts without actions
- Features founder didn't ask for
- Audits instead of implementation
- Reports instead of fixes
