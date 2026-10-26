# Plan: #181

## Files
- `src/rewards.js`: `validateReward(..., perWeek)`, form load/save, limit note and button text.
- `src/redemptions.js`: `usedThisWeek`, check in `requestReward`.
- `src/index.html`, `src/style.css`: Max/wk input and note styling.
- `tests/reward-limits.test.js`.
- Root build files via `npm run build:pages`.

## Steps
1. Implement. 2. Tests: limit reached, new week, denied ignored, validation, button text, form. 3. `npm test`, `npm run build:pages`. 4. PR.

## Rollback
Revert the PR. Leftover `perWeek` values are ignored by older code.
