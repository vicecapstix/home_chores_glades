# Plan #172
- src/render.js: `_statusPass()` helper shared by list filtering and counts; setFilter/setCatFilter no longer reset each other; category pills get counts.
- Tests: tests/filter-combine.test.js (Mine+cat, Overdue+cat, clearing, counts).
- Rollback: revert the PR (no data change).
