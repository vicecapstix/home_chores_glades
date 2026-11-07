# Plan: #252
1. Failing test `tests/week-colours-252.test.js` (committed first).
2. `src/week.js`: import `memberColor` instead of `PCOLS`/`getMembers`; use `memberColor(it.person) || fallback`.
3. `npm test`, `npm run build:pages`, commit root files.
Rollback: revert the PR.
