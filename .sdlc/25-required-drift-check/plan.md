# Plan — #25
## Files
- `.github/workflows/ci.yml` — drop `continue-on-error`, diff all deployed files.
- `CLAUDE.md` — deploy section wording.
- `tests/ci.test.js` — replace "non-blocking" test; assert PWA copy + full comparison.
- Root files — regenerate via `npm run build:pages` (should be unchanged).
## Steps
1. Failing test first (commit). 2. Workflow + docs change. 3. `npm test`, `npm run build:pages`, confirm no root diff.
## Test plan
ci.test.js: no continue-on-error; workflow diffs every PWA file; build:pages(+postbuild) copies them.
## Rollback
Revert the PR; the check goes back to non-blocking.
