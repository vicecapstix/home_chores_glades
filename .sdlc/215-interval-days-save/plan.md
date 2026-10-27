# Plan — #215

## Files
- src/tasks.js: add `[p + 'intervalDays']: t.intervalDays || null` to `paths` in `saveTask`.
- tests/interval.test.js: new tests asserting `patchPaths` payload.
- root index.html (+ sw/manifest/icons if changed) via `npm run build:pages`.

## Steps
1. Commit failing test (patchPaths gets `tasks/a/intervalDays: 12`, and `null` after switching to weekly).
2. One-line fix; test passes unchanged.
3. `npm test`, `npm run build:pages`, commit root files.

## Test plan
Vitest, Firebase mocked. Full suite + build.

## Rollback
Revert the PR; the extra key is harmless if left on the server.
