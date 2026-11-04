# Plan — #258

## Files
- `src/connection.js`: `lastUpdated`, `formatUpdated`, `setLastUpdated`; banner/dot text; `markSynced` records the time.
- `src/cache.js`: `setCacheBanner(show, doc, savedAt)` text.
- `src/main.js`: pass `cached.savedAt` on a cached start.
- `tests/offline-last-updated.test.js` (new); rebuilt root files via `npm run build:pages`.

## Steps
1. Docs commit. 2. Implement. 3. Tests per acceptance criterion. 4. build:pages commit. 5. PR.

## Test plan
Fake timers: live snapshot at 14:05 then disconnect -> banner and dot include 14:05; yesterday and older formats; cached start shows cache time; online shows nothing; no Firebase calls.

## Rollback
Revert the PR; no data migration.
