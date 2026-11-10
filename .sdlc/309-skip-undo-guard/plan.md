# Plan — #309

Files: `src/tasks.js` (skipTask undo), `tests/skip-undo-guard.test.js` (new), root deploy files (build:pages).

Steps
1. Failing tests committed first (2 of 4 fail on main).
2. In the undo callback read `const live = state.tasks[id]`; if `!live || live.done || live.lastDone !== now || live.skippedAt !== now` → `showToast(...)`, return.
3. `npm test`, `npm run build:pages`.

Test plan: tick after skip, changed lastDone, plain undo, non-admin guard.

Rollback: revert the PR; no data changes.
