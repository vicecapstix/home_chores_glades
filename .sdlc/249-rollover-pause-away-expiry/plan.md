# Plan — #249

## Files
- `src/rollover.js`: import and call the two expiry checks before `checkTaskResets()`.
- `tests/rollover-expiry.test.js` (new, fake timers); rebuilt root files via `npm run build:pages`.

## Steps
1. Docs commit. 2. Failing test commit. 3. Fix. 4. build:pages commit. 5. PR.

## Test plan
Pause until D with a daily chore done; advance past midnight with no snapshot: pause cleared via patchRoot, chore reset. Away variant. READONLY variant writes nothing. Repeated ticks resume once.

## Rollback
Revert the PR; no data migration.
