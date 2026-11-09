# Plan — #307
Files: `src/utils.js` (initialLastDone), `tests/monthly-new-chore-end-of-month.test.js` (new, committed failing first), `tests/monthly-calendar.test.js` (fix assertion that encoded the bug), root files via `npm run build:pages`.
Steps: failing test → loop in initialLastDone → update old test → full suite → build:pages.
Test plan: 31 Oct, 31/30/29 Mar, 31 May, 29 Feb 2028, 15 Oct, next-month rule.
Rollback: revert the PR; no data was reshaped.
