# Plan: #176

## Files
- `src/away.js` (new): set/clear/expiry, `computeReturnPatch`, admin form.
- `src/utils.js`: away map, `isAwayNow`, `awayNames`, `awayText`; `dueStatus` and `nextRotationPerson` (optional skip list), `rotationTag`.
- `src/state.js`: arm the away map in `applySnapshot`.
- `src/tasks.js`: reset passes away names to rotation.
- `src/main.js`, `src/render.js`, `src/tv.js`, `src/style.css`: wiring and chip text.
- `tests/away.test.js`; `CLAUDE.md` module list.

## Steps
1. Implement. 2. Tests for due status, rotation skip, streak preserved, auto-expiry, guards. 3. `npm test`, `npm run build:pages`. 4. PR.

## Rollback
Revert the PR. Leftover `awayUntil/awaySince` fields are ignored by older code.
