# Plan: #174

## Files
- `src/teamgoal.js` (new): validation, progress maths, render, set/clear, admin form HTML.
- `src/state.js`: `teamGoal` field + applySnapshot.
- `src/main.js`: pass `teamGoal` from the snapshot, `window.setTeamGoal/clearTeamGoal`, form in the admin panel.
- `src/render.js`: call `renderTeamGoal()`.
- `src/index.html`, `src/style.css`: bar markup + TV sizing.
- `tests/team-goal.test.js`: maths, week boundary, set/clear, guards, readonly, XSS, celebration.
- Root build files via `npm run build:pages`.

## Steps
1. Implement module and wire up. 2. Tests. 3. `npm test`, `npm run build:pages`. 4. PR.

## Rollback
Revert the PR. The leftover `state/teamGoal` key is ignored by older code.
