# Plan #184

Files: `src/cache.js` (one line), `tests/cache-newest-history.test.js` (new), root `index.html`.
Steps: failing test first (committed), then `slice(-HISTORY_LIMIT)`, build:pages.
Tests: 500 entries -> last 50 in order; short history whole; save/load round trip.
Rollback: revert PR.
