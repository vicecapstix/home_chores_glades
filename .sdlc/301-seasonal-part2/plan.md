# Plan — #301
Files: `src/render.js` (Off section, filter counts, disabled check, renderFilters export), `src/seasonal.js` (switchOnNow), `src/utils.js` (todayProgress, weekPlan), `src/printchart.js`, `src/tasks.js` (toggle guard), `src/main.js` (window.switchOnNow), `src/style.css`, `tests/seasonal-off-section.test.js`, root files.
Test plan: one or more tests per acceptance criterion plus READONLY / non-admin cases for the write path. Rollback: revert the PR; no data changes.
