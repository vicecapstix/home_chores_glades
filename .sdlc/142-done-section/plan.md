# Plan
Files: `src/utils.js` (isStaleDoneOnce), `src/tasks.js` (clearDoneOnes), `src/render.js` (grouping + section), `src/main.js` (window handler), `src/style.css`, `tests/done-section.test.js`, rebuilt root deployed files.
Steps: helper, grouping render, clear + undo, styles, tests, build:pages.
Tests: grouping, recurring untouched, today excluded, readonly hides, clear path set, guards, undo restores.
Rollback: revert the PR; no data migration. Cleared tasks are recoverable only via the undo toast or a backup.
