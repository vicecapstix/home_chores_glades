# Plan 106
Files: src/utils.js, src/render.js, src/ui.js, src/tv.js, tests/streak-expiry.test.js, built root files.
Steps: failing test -> add helper -> swap 3 call sites -> npm test, build:pages.
Tests: today, yesterday, 2 days ago, missing date, missing streak, TV html stale/live.
Rollback: revert PR; no data impact.
