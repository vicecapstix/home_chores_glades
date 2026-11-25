# Plan #391

## Files
- src/away.js: `computeReturnPatch` takes optional `overlapMs`; `checkAwayExpiry` returns early while `state.pause`.
- src/pause.js: `computeResumePatch` merges the union-shift patch for expired away members; `resume` clears their local away fields.
- tests/away-pause-overlap.test.js (new).

## Steps
1. Docs commit. 2. Failing test commit. 3. Fix. 4. npm test, build, build:pages, commit root files.

## Test plan
Away+pause overlap = 111 h shift; away waits during pause; away alone 63 h; pause alone 87 h.

## Rollback
Revert the PR; no data migration (shape unchanged).
