# Plan — #173
## Files
`src/redemptions.js` (toGive(), markGiven()), `src/rewards.js` (To give list, member status, badge), `src/main.js` (window.markRewardGiven), `tests/reward-given.test.js`, root deploy files.
## Steps
1. Helpers + guards. 2. UI. 3. Tests for list order, writes, guards, badge, undo, member text. 4. `npm test`, `npm run build:pages`.
## Rollback
Revert PR; extra `givenAt` fields on existing records are ignored by older code.
