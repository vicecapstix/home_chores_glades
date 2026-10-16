# Plan — #53

## Files
- `src/firebase.js` — add `decideRedemption(id, status, by)` (runTransaction on one entry).
- `src/redemptions.js` — add `decideRequest`, `recentDecided`.
- `src/rewards.js` — admin pending list with buttons, member outcome list, header badge.
- `src/index.html` / `src/style.css` — badge span + small styles.
- `src/main.js` — `window.approveRedemption/denyRedemption`, pass admin fn to refresh.
- `tests/redemptions-decide.test.js`.

## Steps
1. Firebase helper. 2. Logic + tests. 3. UI. 4. `npm test`, `npm run build:pages`, commit root files.

## Rollback
Revert the PR. Extra `decidedAt/decidedBy` fields on entries are ignored by older code.
