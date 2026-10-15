Queue position: 1

## Problem
History (capped at 500) is only visible as aggregated stats/CSV; parents can't see who did what recently.

## Outcome / acceptance criteria
- [ ] History modal listing last 50 completions (who, what, when, points), filter by member
- [ ] Opened from header; follows CLAUDE.md modal pattern (`.hidden` class, `openModal/closeModal`)
- [ ] Uses existing `history` — no new data
- [ ] Hidden/readable in readonly TV view (no write controls)
- [ ] Tests for list rendering + esc()

## Affected users
Admin, members, TV (read-only).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep history capped at 500 and reads small. Never write to or change rules on the live DB; tests use mocks only.
- Read existing data only; cap unchanged.
- Deploy note (updated 15 Oct): until #23 is merged, change `src/` only — #23 does the first full rebuild of root `index.html`. After #23, every PR runs `npm run build:pages` and commits the root files so merging deploys; on conflict, merge main and rebuild.

## Open questions
None.

## Verification
`npm test` passes (including the new tests listed above) and `npm run build` succeeds.

