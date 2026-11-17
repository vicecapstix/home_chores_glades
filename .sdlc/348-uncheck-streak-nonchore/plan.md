# Plan: #348

## Files
- `src/tasks.js`: add `!h.type &&` to the `otherSameDay` predicate.
- `tests/uncheck-streak-nontype.test.js`: swap and bonus cases (fail on main) plus real-second-completion case.
- Root `index.html` rebuilt with `npm run build:pages`.

## Steps
1. Failing test committed first. 2. One-line fix. 3. build:pages.

## Test plan
`npm test`, `npm run build`.

## Rollback
Revert the PR; no data changes.
