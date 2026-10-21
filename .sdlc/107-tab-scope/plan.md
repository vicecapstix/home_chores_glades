# Plan 107
Files: src/ui.js, src/history.js, src/main.js, src/index.html, tests/tab-scope.test.js, tests/week-recap.test.js (fixture), built root files.
Steps: failing test -> scope selector -> add historyFilterClick + wire -> npm test, build:pages.
Tests: setLbTab leaves Stats/History active; setStatsTab leaves lb tabs; gap click ignored; pill click (incl. nested child, Everyone) applies.
Rollback: revert PR; no data impact.
