# Plan #358
Files: src/utils.js (validMinutes, minutesLabel, weekPlan totals), tasks.js (add/edit/save), render.js (tag), week.js + style.css, index.html (input), ui.js (templates), chorefile.js, starter.js (makeTask), CLAUDE.md (data shape), tests/chore-minutes.test.js.
Steps: helper, form, card, planner, templates, chore file, tests, build:pages.
Tests: one per acceptance criterion plus READONLY and non-admin add/edit.
Rollback: revert the PR; the optional field is simply ignored by older code.
