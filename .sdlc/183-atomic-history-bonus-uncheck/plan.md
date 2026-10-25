# Plan — #183

## Files
- `src/config.js` — `HISTORY_CAP = 500`
- `src/firebase.js` — use `HISTORY_CAP`; add `removeHistoryEntry(match)`
- `src/bonus.js` — append via `appendHistory`, undo via `removeHistoryEntry`, add `taskName`
- `src/tasks.js` — `undoCompletionRecords` uses `removeHistoryEntry`
- tests: new `tests/history-atomic-writers.test.js`; update firebase mocks in existing tests that exercise bonus/uncheck; rules test `rules-tests/state.rules-test.js`
- root deploy files via `npm run build:pages`

## Steps
1. Failing tests (commit). 2. Implement helper + callers. 3. Fix mocks of existing tests (not the new test). 4. `npm test`, `npm run build:pages`. 5. PR.

## Test plan
Concurrent append + bonus keeps both; uncheck removes only its entry from a changed live array; bonus entry shape; cap in one place; rules emulator test (runs in CI).

## Rollback
Revert the PR; old behaviour (whole-array writes) returns. No data migration.
