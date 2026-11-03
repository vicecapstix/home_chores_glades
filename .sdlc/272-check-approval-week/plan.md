# Plan — #272

## Files
- `src/tasks.js` `applyToggle`: compute tick week; use for `lastDoneWeek`; pass `countWeek` on award.
- `tests/check-approval-week.test.js` (new).
- Rebuilt root files via `npm run build:pages`.

## Steps
1. Docs commit. 2. Failing test commit. 3. Fix. 4. Extra tests commit. 5. build:pages commit. 6. PR.

## Test plan
Fake timers: tick Sun 20:00, approve Mon 08:00 -> no weekPoints, lastDoneWeek = old Monday, history at tick; same-week approval counts; uncheck reverses the right week.

## Rollback
Revert the PR; no data migration (existing records unaffected).
