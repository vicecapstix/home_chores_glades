# Plan (#171)
Files: `src/utils.js` (baseStatus), `tests/duestatus-now.test.js`, root deploy files (rebuilt).
Steps:
1. Commit failing tests with fake timers: one-off soon/overdue at a given `now`, specific-day chore at a given `now`, results independent of the system clock, `todayProgress(tasks, now)`.
2. Pass `now` through in `baseStatus` for once/weekdays.
3. `npm test`, `npm run build`, `npm run build:pages`; commit root files.
Test plan: 5 new tests; full suite.
Rollback: revert the PR.
