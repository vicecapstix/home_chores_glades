# Plan - #88

## Files
src/rollover.js (new), src/main.js (start timer), tests/rollover.test.js, tests/rollover-readonly.test.js, root deploy files.

## Steps
1. Commit docs + failing tests. 2. Implement rollover.js, wire in main.js. 3. npm test/build, build:pages, commit.

## Test plan
Fake timers: done daily resets after 25h without snapshot and patchRoot called; soon->overdue triggers render; no change -> no render; visibilitychange ticks; READONLY: resets locally, no write.

## Rollback
Revert PR; no data changes.
