# Plan: #389

## Files
- `src/tasks.js`: set `lastDoneAt` on check, clear on uncheck/rollback, use it in `completion.at`.
- `tests/uncheck-after-pause.test.js` (new, committed first and failing).
- `.sdlc/389-uncheck-after-pause/*`, root deploy files via `npm run build:pages`.

## Steps
1. Docs + failing test. 2. Fix. 3. `npm test`, `npm run build:pages`.

## Test plan
Tick, run `computeResumePatch` (pause) and `computeReturnPatch` (away), uncheck: history empty, points 0, completedCount restored, streak restored; reset freeze still holds; a post-pause tick unaffected.

## Rollback
Revert the PR. `lastDoneAt` is ignored by older code.
