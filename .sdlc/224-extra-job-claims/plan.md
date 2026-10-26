# Plan: #224

## Files
- `src/claims.js` (new): validate, submit, decide, render helpers
- `src/state.js`, `src/firebase.js` (writeState), `src/main.js`: carry `claims`, window handlers
- `src/rewards.js`: render claims section and badge count; `src/index.html`, `src/style.css`: form + styles
- `tests/claims.test.js` (new, committed failing first), `CLAUDE.md` (data shape/file list)
- Root deployed files rebuilt with `npm run build:pages`

## Steps
1. Failing tests. 2. claims.js. 3. Wire state/main/rewards/html/css. 4. Docs. 5. Tests + build:pages.

## Test plan
Vitest with mocked Firebase: validation, submit write + cap + failure, approve (edited/default points, one history entry, claim removed, double tap), deny, admin-only, READONLY, restore on failure, XSS escaping, form present in index.html.

## Rollback
Revert the PR. Any leftover `state/claims` data is ignored by older builds.
