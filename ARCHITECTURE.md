# ARCHITECTURE.md

## Data Flow
Google Sheet → /api/import-pipeline → tasks.ts → persistence.ts → localStorage → StateProvider → UI

## Task States
not_started → committed_today → in_progress → done
                                             → waiting_on (person, date, notes) → done
                                             → blocked (reason) → unblock
                                             → deferred (reason, review date) → review

## Pages
/ (CEO Brief), /today (Execute), /decisions, /review, /warroom, /milestones, /stream/[slug], /admin, /trust

## Persistence
localStorage key: svaas-os-state. DATA_VERSION=3. Auto-clears stale cache on version mismatch.
