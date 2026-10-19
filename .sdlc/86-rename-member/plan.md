# Plan — #86
Files: `src/firebase.js` (patchPaths), `src/members.js` (renamePaths, renameMember), `src/main.js` (button + handler), `tests/rename-member.test.js`.
Steps: tests; implement; `npm run build:pages`.
Test plan: key moves with pinHash/points/avatar; paths for tasks/history/redemptions; single patchPaths call; duplicate/invalid/empty/non-admin/readonly rejected; session updated.
Rollback: revert PR; no schema change.
