# Plan: Time of day part 2: grouping and Now filter

**Files:** src/utils.js (3 helpers), src/render.js (filter, sort, pill), src/rollover.js (slot in signature), README.md (filter row), tests/time-of-day-now.test.js, root index.html.

**Test plan:** fake timers at 07:00/15:00/20:00 and boundaries 11:59/12:00/16:59/17:00; ordering; TV render. **Rollback:** revert the PR (no data change).
