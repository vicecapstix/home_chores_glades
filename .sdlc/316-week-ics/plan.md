# Plan #316
Files: src/weekics.js (new), src/week.js (picker), src/index.html, src/style.css, src/main.js (window.downloadWeekIcs), CLAUDE.md file list, tests/week-ics*.test.js.
Steps: build ICS; wire UI; tests; npm test; build:pages.
Test plan: events/all-day/timed, filters, escaping, folding, Blob + no fetch, picker escaping, READONLY.
Rollback: revert PR (no data written).
