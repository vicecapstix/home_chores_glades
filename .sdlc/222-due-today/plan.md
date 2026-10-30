# Plan (#222)

## Files
- `src/utils.js`: `baseStatus` (`s > d`), `todayProgress` (drop the `validTime` condition for recurring due-today).
- `tests/due-today.test.js`: new. Existing tests that assumed overdue on the due day are updated to the new rule.
- Root deploy files rebuilt with `npm run build:pages`.

## Steps
1. Commit the failing test.
2. Change `baseStatus` and `todayProgress`.
3. Update older tests that encoded the previous rule, listing each in the PR.
4. `npm test`, `npm run build:pages`.

## Rollback
Revert the PR (single `>=` to `>` change plus the progress condition).
