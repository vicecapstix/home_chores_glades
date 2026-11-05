# Plan #257
Files: utils.js (CHORE_ICONS, iconPrefix, weekPlan item), render.js, week.js, index.html (select), tasks.js (add/edit/save), ui.js (templateTask, applyTemplate), starter.js (makeTask), chorefile.js (build/validate), CLAUDE.md + README.md, tests/chore-icons.test.js.
Test plan: one test per criterion plus XSS value, non-admin add/save, template and chore-file round trips.
Rollback: revert PR; unknown field is ignored by older code.
