# Plan — #276
Files: `src/undo.js`, `src/index.html` (button `disabled`), `tests/undo-stale-entries.test.js` (new), root files via `npm run build:pages`.
Steps: failing tests committed first -> implement -> build:pages.
Test plan: older entry not undoable after Undo (+1 h); button disabled when hidden/after expiry and enabled while shown; LIFO still works.
Rollback: revert PR.
