# Plan
Files: `src/ui.js` (export `csvField`, harden it, add time column), `tests/csv-export.test.js`, rebuilt root files.
Steps: failing test commit, implement, `npm test`, `npm run build:pages`.
Tests: csvField prefix cases (= + - @ tab CR), quoting (comma, quote, CR, LF), numbers untouched; exportCSV date/time columns and injection in a task name.
Rollback: revert the PR; no data migration.
