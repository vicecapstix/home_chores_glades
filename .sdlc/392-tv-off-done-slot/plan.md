# Plan #392

## Files
- tests/tv-off-done-slot.test.js (new, written failing first)
- src/render.js: add data-k to the two details elements
- src/style.css: placement rules at >=900px and >=1200px
- root index.html (build:pages)

## Steps
1. Commit intent/spec/plan. 2. Failing test. 3. Fix. 4. npm test, build, build:pages.

## Test plan
Render with an off chore and a stale done one-off; assert data-k. Read style.css and assert the rules exist inside the 900 and 1200 media blocks with full-width span and a row after the ok row.

## Rollback
Revert the PR; purely presentational.
