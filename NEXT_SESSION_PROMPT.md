# NEXT_SESSION_PROMPT.md

Use this exact prompt to resume in a new Kiro session:

---

Continue SVAAS Founder OS.

Repository: vidhivakil-oodles/svaas-founder-os
Branch: main
Deployed: svaas-founder-os.vercel.app

Read these files first:
- PROJECT_BRAIN.md (full context)
- CURRENT_STATE.md (what works, what doesn't)
- KNOWN_PROBLEMS.md (bugs and gaps)
- UX_BACKLOG.md (ranked usability issues)
- OPEN_DECISIONS.md (unresolved product decisions)
- FOUNDER_VISION.md (what this app must feel like)

Current state:
- 358 real tasks from SVAAS Execution Engine
- 22 commits pushed, Vercel auto-deploys
- localStorage persistence with DATA_VERSION=3
- Task states: not_started, committed_today, in_progress, waiting_on, blocked, deferred, done
- Home page: CEO Brief (5 actionable cards with buttons)
- Today page: commitment loop, consequences, wins, state transitions
- War Room: overdue + blocked + critical only
- Supabase: schema ready, NOT connected (needs anon key)

Tech: Next.js 16, TypeScript, Tailwind, shadcn/ui, localStorage, Vercel

Product principles:
- Chief of Staff, not dashboard
- Every card: What? Why? Consequence? Action button.
- 30-second comprehension per screen
- Trust over fabrication
- Founder behavior over task management

Do NOT: add dashboards, add metrics, add audits, fabricate data, create new reports
DO: fix known problems, improve actionability, connect Supabase when key available

Priority backlog:
1. Stream detail: show only top 10 actionable (HIGH)
2. Auto-calculate stream status from task states (MEDIUM)
3. Connect Supabase for multi-device sync (MEDIUM)
4. Build task-to-task dependency data (MEDIUM)
5. Daily commitment reset mechanism (MEDIUM)

---
