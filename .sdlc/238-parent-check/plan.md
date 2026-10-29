# Plan — #238

## Files
- src/tasks.js: split `toggleTask` into entry + `applyToggle`; `submitForCheck`, `approveCheck`, `sendBackCheck`; add/save/edit flag.
- src/firebase.js: `takeCheckPending` transaction.
- src/render.js: tag, waiting tag, admin buttons. src/utils.js: waiting is never overdue.
- src/main.js handlers; src/index.html checkbox; src/style.css; CLAUDE.md data shape.
- tests/parent-check.test.js; root deploy files.

## Steps
1. Refactor with existing tests green. 2. Flag + submit. 3. Approve / send back. 4. UI. 5. Tests, build:pages.

## Rollback
Revert the PR. Fields are optional; leftover `checkPending` on a task is ignored by older code (task just looks undone).
