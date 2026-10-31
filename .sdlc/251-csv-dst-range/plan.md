# Plan — #251

1. Failing tests first in tests/csv-export-dst.test.js using TZ=Europe/London: 23:30 on 2026-10-25 included; 00:30 on 2026-03-30 excluded when to=2026-03-29.
2. Fix in src/ui.js exportCSV: end bound = next local midnight - 1 ms.
3. `npm test`, `npm run build:pages`, commit root files.

Rollback: revert the PR.
