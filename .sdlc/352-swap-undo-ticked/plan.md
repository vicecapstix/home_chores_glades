# Plan: #352

Files: `src/swaps.js` (guard inside the undo closure), `tests/swap-undo-ticked.test.js` (new), root `index.html` rebuilt.

Steps
1. Commit failing test (done, 2 of 3 fail on main).
2. Capture `lastDone` after accept; guard in undo.
3. `npm test`, `npm run build:pages`.

Test plan: done chore, changed lastDone, untouched chore (see the PR table).

Rollback: revert the PR; no data changes to undo.
