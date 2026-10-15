# Plan — #29

Files: `src/tasks.js`, `tests/granular.test.js`, `.sdlc/29-*`, rebuilt root deploy files.

Steps
1. Failing test first (mocked firebase): asserts `writeState` is not called and the granular helpers are called with the right paths (incl. weekday reset, readonly).
2. Implement changes in `src/tasks.js` (no firebase.js change; `patchRoot` already does a multi-path `update`).
3. `npm test`, `npm run build:pages`, commit root files.

Test plan: see `tests/granular.test.js`. Existing suites must stay green.

Rollback: revert the PR (data shape unchanged, nothing to migrate).
