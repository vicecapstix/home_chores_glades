# Plan (#221)
Files: `tests/bonus-week.test.js` (new), `src/bonus.js`, `tests/bonus.test.js` (old assertion encoded the bug), root `index.html`.
Steps:
1. Commit failing tests: −5 deduction → currentWeekPoints equals weekRecap; top of This week = recap winner; −15 → weekPoints 0.
2. `src/bonus.js`: `countWeek: true` for all adjustments; update the comment.
3. Update the old bonus.test.js expectation; `npm test`, `npm run build:pages`, commit root files.
Rollback: revert the PR.
