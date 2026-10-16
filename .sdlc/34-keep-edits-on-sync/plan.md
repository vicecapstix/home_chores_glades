# Plan — #34
Files: `src/render.js` (preserve/restore around innerHTML swap; export `renderTasks`), `src/tasks.js` (`saveTask` leaves edit mode), `tests/render-preserve.test.js`.
Steps: failing test (edit + subtask typed + expanded survive a re-render); implement; `npm test`; `npm run build:pages`.
Rollback: revert PR; no data changes.
