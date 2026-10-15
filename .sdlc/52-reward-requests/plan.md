# Plan — #52
Files: `src/firebase.js` (spendPoints, refundPoints via runTransaction; writeState carries redemptions), `src/state.js`, `src/redemptions.js` (new), `src/rewards.js` (Request button, pending list), `src/undo.js` (optional verb), `src/main.js`, `src/index.html`, `src/style.css`, tests, rebuilt root files.
Steps: state/firebase plumbing → redemptions.js logic → UI → tests (atomic spend, cap, guards, undo, XSS, writeState payload) → `npm test`, `build:pages`.
Rollback: revert PR; optional `redemptions` node is ignored by older code (points already spent would stay deducted — admin can fix via #53 deny or manually).
