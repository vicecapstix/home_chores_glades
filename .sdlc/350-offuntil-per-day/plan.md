# Plan #350
Files: src/utils.js (add offOnDate, use in weekPlan), src/printchart.js (mask in dueDays/chartRows), tests/week-off-per-day-350.test.js, rebuilt root index.html.
Steps: failing tests -> fix -> npm test/build/build:pages.
Test plan: weekPlan with offUntil Wed; whole-week off; ics; chartRows/dueDays.
Rollback: revert PR.
