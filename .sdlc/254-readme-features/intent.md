# Intent (#254)

## Problem
README.md "Features" was refreshed by #223/#242 but still misses features merged 25–27 Oct:
- TV auto-cycle between chores, leaderboard and rewards (#148/#214)
- Reward limits per week (#181)
- Due-time reminder notifications for the assignee (#150)
- Reward hand-out "To give" list and Given ✓ (#173)
- Points shown on each chore card (#177), shared ranks for ties (#170)
- History now includes reward requests and refunds (#180) — the "Activity history" line still says "recent completions"

## Outcome / acceptance criteria
- [ ] README Features list mentions each item above in one short line
- [ ] No feature listed that isn't on main
- [ ] CLAUDE.md file structure still matches `src/` (currently it does)

## Affected users
Admin/JT reading the docs.

## Constraints
Docs only; no `src/` changes, so no root rebuild needed.

## Open questions
None.

## Verification
Manual diff of README features against `src/`; `npm test` and `npm run build` unchanged.

