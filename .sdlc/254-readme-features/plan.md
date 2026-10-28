# Plan (#254)
Files: `tests/docs.test.js`, `README.md`.
Steps:
1. Add a failing drift test asserting README mentions each feature (and the history line no longer says "recent completions" only); commit.
2. Update README Features list.
3. `npm test`, `npm run build:pages` (expect no root-file change).
Test plan: 1 new test in `tests/docs.test.js`; full suite green.
Rollback: revert the PR (docs only).
