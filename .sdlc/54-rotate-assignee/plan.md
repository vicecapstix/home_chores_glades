# Plan — #54
## Files
`src/utils.js` (rotationList, nextRotationPerson), `src/tasks.js` (reset, edit chips, save), `src/members.js` (remove/rename), `src/style.css`, `tests/rotation.test.js`, root deploy files via `npm run build:pages`.
## Steps
Helpers -> reset hook -> edit UI + save -> member remove/rename -> tests -> build:pages.
## Test plan
12 tests in `tests/rotation.test.js` (helper wrap/skip/object form, reset rotation + not-due + paused, edit save/clear/admin guard/escape, removal + rename).
## Rollback
Revert the PR; `rotation` is an optional field that older code ignores.
