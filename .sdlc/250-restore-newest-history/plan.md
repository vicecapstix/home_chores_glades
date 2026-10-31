# Plan — #250

1. Failing test first: tests/restore-newest-history.test.js (600 entries -> t100..t599; 500 or fewer unchanged).
2. One-line fix in src/restore.js: `.slice(-HISTORY_CAP)`.
3. `npm test`, `npm run build:pages`, commit root files.

Rollback: revert the PR.
