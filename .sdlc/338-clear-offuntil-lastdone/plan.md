# Plan #338
Files: src/tasks.js (saveTask, +2 lines), tests/seasonal-clear-offuntil.test.js.
Steps: commit failing test first; add wasOff check and lastDone reset; npm test; npm run build:pages.
Test plan: 1 failing test (overdue after clear) + 3 guard tests (once, done, not-off).
Rollback: revert the PR; the only effect is lastDone on save.
