# Plan — #43

## Files
- `src/tasks.js` — `toggleTask`: derive `awardee`; use it for lastDoneBy, points, history.
- `tests/anyone-points.test.js` — new tests.

## Steps
1. Commit failing test (Anyone task ticked by Alice -> Alice points, lastDoneBy, history).
2. Implement `awardee`.
3. Add edge tests: uncheck reversal, no session, setup mode, assigned task unchanged.
4. `npm test`, `npm run build:pages`, commit root files.

## Rollback
Revert the PR; no data migration, extra `lastDoneBy` fields on Anyone tasks are harmless.
