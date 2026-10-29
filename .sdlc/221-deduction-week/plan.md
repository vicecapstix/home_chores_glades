# Plan (#221)
Files: `tests/bonus-week.test.js`, `tests/bonus-week-tx.test.js` (new), `src/bonus.js`, `src/firebase.js` (review round), `tests/bonus.test.js` (old assertion encoded the bug), root `index.html`.
Steps:
1. Commit failing tests: −5 deduction → currentWeekPoints equals weekRecap; top of This week = recap winner; −15 → weekPoints 0.
2. `src/bonus.js`: `countWeek: true` for all adjustments; update the comment.
3. Update the old bonus.test.js expectation; `npm test`, `npm run build:pages`, commit root files.
4. Review round (28 Oct): failing tests on the REAL transaction (floor, undo of a floored deduction); return
   `weekDelta` and accept `weekPts` in `adjustMemberPoints`; undo uses them.
Rollback: revert the PR.
