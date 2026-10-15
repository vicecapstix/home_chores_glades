# Plan — #51

Files: `src/rewards.js` (new), `src/state.js`, `src/firebase.js` (writeState carries rewards), `src/main.js` (snapshot + window handlers), `src/index.html` (modal + header button), `src/style.css`, tests (`tests/rewards.test.js`, a11y count bumps), rebuilt root files.

Steps
1. Add `rewards` to state/applySnapshot/snapshot handler/writeState.
2. `rewards.js`: validation, add/update/delete (patchRoot paths), render, open/refresh.
3. Modal + header button + CSS following the modal pattern in CLAUDE.md.
4. Tests for each acceptance criterion; `npm test`, `npm run build:pages`.

Test plan: CRUD paths, 50 cap, validation, admin/readonly guards (no firebase call), XSS escaping, render for member vs admin, writeState includes rewards, modal markup a11y.

Rollback: revert the PR. The optional `rewards` node is ignored by older code; leaving it in the DB is harmless.
