# Plan: #402
Files: src/utils.js (daysLate, lateLabel), src/render.js (cardHTML tag), tests/days-late-*.test.js (3 files), root build files.
Steps: helper reusing dueStatus -> render tag -> tests (Europe/London TZ for DST) -> npm test, build, build:pages.
Tests: daily/weekly/interval/once/weekdays, dueTime Due today, DST spring+fall, pause/away/off/skip/check excluded, card HTML, phone render(), readonly TV render().
Rollback: revert the PR; no data changes.
