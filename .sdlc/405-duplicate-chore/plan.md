# Plan — #405
Files: `src/tasks.js` (`duplicateTask`, Copy button in `editTask`), `src/main.js` (import + `window.duplicateTask`), `CLAUDE.md` (tasks.js line), tests `tests/duplicate-chore.test.js` and `tests/duplicate-chore-readonly.test.js`, root files via `npm run build:pages`.
Steps: tests per acceptance criterion -> implement -> `npm test` -> build:pages.
Rollback: revert the PR; copies already made are ordinary chores.
