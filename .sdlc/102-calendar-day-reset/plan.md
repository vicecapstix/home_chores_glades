# Plan — #102

## Files
src/utils.js (`daysSince`, `initialLastDone`), src/tasks.js (`checkTaskResets`), tests/calendar-reset.test.js, root deploy files.

## Steps
1. Commit docs + failing tests. 2. Implement. 3. `npm test`, `npm run build`, `npm run build:pages`, commit.

## Test plan
Fixed `now`: daily done 21:00 resets at 00:00 next day; done 00:05 still done 23:59; weekly done Sun 22:00 resets next Sun 00:00 (not before); dueStatus agrees; DST-day calendar counting.

## Rollback
Revert the PR; no data changes.
