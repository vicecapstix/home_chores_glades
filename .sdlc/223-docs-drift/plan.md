# Plan (#223)
Files: `tests/docs.test.js`, `README.md`, `CLAUDE.md`, `RESET.md`.
Steps:
1. Add failing drift tests (filter pills from render.js, feature keywords, task fields from tasks.js, member fields, `pause`) and commit.
2. Update README feature list + Usage table, CLAUDE.md data shapes and `/state` tree, RESET.md restore pointer.
3. `npm test`, `npm run build:pages` (expect no root-file change).
Test plan: 4 new tests in `tests/docs.test.js`; full suite green.
Rollback: revert the PR (docs only).
