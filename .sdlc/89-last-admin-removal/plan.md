# Plan — #89

## Files
src/members.js, src/redemptions.js, src/main.js (wire args), tests/members.test.js, tests/redemptions.test.js, root deploy files.

## Steps
1. Commit docs + failing tests. 2. Last-admin guard, redemption cleanup, self-logout. 3. Member-exists guard on refund paths. 4. `npm test`, `npm run build:pages`.

## Test plan
Refuse last admin (no write); allow when 2 admins; pending redemptions dropped in the write, decided kept; self-removal callback after write, not on failure; undo skips refund for missing member.

## Rollback
Revert the PR; no data migration.
