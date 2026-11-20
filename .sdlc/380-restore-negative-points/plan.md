# Plan (#380)
Files: `src/restore.js` (one helper, one call site), `tests/restore-negative-points.test.js`.
Steps: failing test (committed) -> add `signed()` -> use for `points` -> test, build:pages.
Test plan: -5 kept; other counters clamp; non-numeric -> 0.
Rollback: revert the PR; no data migration.
