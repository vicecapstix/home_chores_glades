# Plan — #217

## Files
- `src/redemptions.js`: `idsToDrop` filter; refusal toast text.
- `tests/redemptions-keep-undelivered.test.js` (new); `tests/redemptions.test.js` (existing cap test uses given entries; toast text).
- Rebuilt root files via `npm run build:pages`.

## Steps
1. Docs commit. 2. Failing test commit. 3. Fix. 4. build:pages commit. 5. PR.

## Test plan
99-entry log, oldest approved & not given -> not in idsToDrop; denied/given dropped first oldest first; all undroppable -> toast, no spend, no write.

## Rollback
Revert the PR; no data migration.
