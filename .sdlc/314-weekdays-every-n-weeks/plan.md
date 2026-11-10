# Plan — #314

Files: `src/utils.js` (validEveryWeeks, weekIsOn, prevScheduledStart, baseStatus, dueTimePassedToday, weekPlan, freqLabel), `src/tasks.js` (checkTaskResets, addTask, editTask, saveTask), `src/index.html` + `src/main.js` + `src/style.css` (select, toggle, hidden rule), `src/printchart.js` (dueDays), `src/ui.js` (templates), `src/chorefile.js` + `src/starter.js` (file validate/build, makeTask anchor), `CLAUDE.md`, tests, root files.

Steps: failing tests first; helpers; wire status/reset/planner/print; forms (with `.hidden` CSS rule); templates/files; CLAUDE.md; `npm test`; `npm run build:pages`.

Test plan: `tests/weekdays-every-n-weeks.test.js` (week math, 6-week reset/status, planner, print, forms incl. guards, template/file round trips).

Rollback: revert the PR; tasks with the fields behave as weekly weekdays chores.
