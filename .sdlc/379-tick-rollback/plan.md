# Plan (#379)
Files: `src/tasks.js` (applyToggle), `tests/tick-rollback.test.js`.
Steps: failing test first (committed) -> add `rollBack` helper, split adjust try/catch so a failing `patchMember` (points already given) is not rolled back -> tests, build:pages.
Test plan: ok:false, thrown error, success path unchanged (tests/tick-rollback.test.js).
Rollback: revert the PR; no data migration.
