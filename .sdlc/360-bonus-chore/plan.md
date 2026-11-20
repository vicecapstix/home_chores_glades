# Plan (#360)
Files: new `src/bonuschore.js`; `src/state.js`, `src/cache.js` (new node), `src/tasks.js` (earned), `src/render.js` (tag/total), `src/main.js` (window handlers, admin panel), `CLAUDE.md` (docs), `tests/bonus-chore.test.js`.
Steps: module -> wire state/cache -> points -> card -> admin panel -> tests -> build:pages.
Test plan: one test per acceptance criterion plus READONLY and non-admin write cases (tests/bonus-chore.test.js).
Rollback: revert the PR; a leftover `bonusChore` node is ignored by older code.
