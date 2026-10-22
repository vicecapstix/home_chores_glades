# Plan
- `src/firebase.js`: add `appendHistory(entry, cap=500)` using runTransaction on `state/history`.
- `src/tasks.js`: toggleTask uses it instead of `patchRoot({history})`.
- Tests: new `tests/atomic-history.test.js` (order, cap 500, concurrent writer, object shape); update mocks in tasks/anyone-points/uncheck-restore tests.
- Steps: implement, `npm test`, `npm run build:pages`, commit root files.
- Rollback: revert the PR; data shape unchanged.
