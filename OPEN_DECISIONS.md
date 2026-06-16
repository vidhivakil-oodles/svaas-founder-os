# OPEN_DECISIONS.md

## Business Decisions (Founder Must Decide)

| # | Decision | Default | Status | Why It Matters |
|---|----------|---------|--------|---------------|
| 1 | Business Structure | LLP | Pending | Blocks entity formation, bank, GST, trademark |
| 2 | Launch MRP | ₹599 | Pending | Blocks label printing, pricing on website |
| 3 | Launch SKU Count | 3 (oil + 2 bath salts) | Pending | Affects production planning, packaging |
| 4 | Packaging | Hybrid (existing for soft, amber for public) | Pending | Affects timeline and sunk cost recovery |
| 5 | Fragrance Direction | Minor EO adjustment | Pending | Affects formula lock |
| 6 | Trademark Filing | Immediately after entity | Pending | Blocks IP protection |
| 7 | Manufacturing Model | Founder-led to 200/month | Pending | Affects hiring timeline |
| 8 | Entity Name | SVAAS LLP | Pending | Blocks LLP filing |

## Technical Decisions (Builder Must Decide)

| # | Decision | Recommended | Why |
|---|----------|-------------|-----|
| 1 | Supabase vs localStorage | Supabase when key available | Multi-device sync required |
| 2 | Task dependencies: manual vs auto-parse | Manual for critical path (30-50 edges) | NLP parsing unreliable |
| 3 | Commitment reset: midnight vs manual | Midnight auto-reset | Matches daily rhythm |
| 4 | /bottlenecks page: keep vs remove | Remove (War Room covers it) | Reduces confusion |
| 5 | /command page: keep redirect vs delete | Delete route entirely | Clean architecture |
| 6 | Impact scores: calculate vs hide | Hide until deps exist, show "Not assessed" | Honest > fabricated |
| 7 | Stream status: seed vs auto-calculate | Auto-calculate on every page load | Single source of truth |
