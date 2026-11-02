# Plan — #271
Files: `src/pending.js` (`dropRetry`, `manual` state, tag), `src/tasks.js` (call `dropRetry` in the `patchTask` catch of `applyToggle`), `tests/failed-toggle-retry.test.js`, root deploy files via `npm run build:pages`.
Steps: failing test (committed first) → fix → full tests/build → build:pages.
Tests: real firebase.js + pending.js with the Firebase SDK mocked; 3 tests.
Rollback: revert the PR; no data change.
