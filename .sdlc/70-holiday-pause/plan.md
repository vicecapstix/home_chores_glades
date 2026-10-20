# Plan — #70

## Files
src/pause.js (new: pure `computeResumePatch`, `setPause`, `clearPause`, `checkPauseExpiry`, `pauseText`, `renderPauseBanner`), src/utils.js (`setPauseUntil`, dueStatus), src/state.js, src/firebase.js (writeState), src/tasks.js (checkTaskResets), src/main.js (wire, window handlers, admin panel), src/index.html, src/style.css, tests/pause.test.js, root deploy files.

## Steps
1. Docs commit. 2. State/utils/firebase plumbing. 3. pause.js. 4. UI. 5. tests, `npm test`, `npm run build:pages`.

## Test plan
Fixed dates: dueStatus paused vs not; checkTaskResets skipped; computeResumePatch (shift, once untouched, done-during-pause untouched, streak shift, cap); set/clear guards; expiry; writeState keeps pause; applySnapshot.

## Rollback
Revert the PR; a stray `state/pause` node is ignored by old code.
