# Plan (#220)
Files: `tests/uncheck-badges.test.js` (new), `src/tasks.js`, root `index.html` (rebuilt).
Steps:
1. Commit failing tests: 10th completion unticked → `getting_started` removed; 3rd streak day unticked → `consistent`
   removed; old badges kept.
2. `undoCompletionRecords` returns the restored streak; `toggleTask` uncheck path compares BADGES before/after and
   patches `badges` without the lost ones (try/catch + showToast).
3. `npm test`, `npm run build:pages`, commit root files.
Rollback: revert the PR.
