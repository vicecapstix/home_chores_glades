# Plan: #140

## Files
- `src/bonus.js` (new): `validateBonus`, `adjustBonus`.
- `src/main.js`: "± Points" button + `window.adjustBonus` (prompts).
- `src/history.js`, `src/ui.js` (stats, CSV), `src/utils.js` (`weekRecap` count): bonus display/exclusion.
- `tests/bonus.test.js`; rebuilt root `index.html`.

## Steps
1. Core module + tests. 2. Wire UI. 3. Display changes. 4. `npm run build:pages`, commit root files.

## Test plan
Award, deduct, confirm-below-zero, cap 500, undo, validation, reason length, non-admin no-op, escaped history, weekly recap.

## Rollback
Revert the PR; existing bonus history entries would show as blank-task rows but are harmless.
