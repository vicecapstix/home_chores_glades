# Plan — #92

## Files
src/utils.js (`isSkipped`, `dueStatus` tweak), src/tasks.js (`skipTask`), src/render.js (button + tag), src/main.js (`window.skipTask`), src/style.css (hide for member/readonly), tests/skip-chore.test.js, root deploy files.

## Steps
1. Commit docs + tests. 2. `isSkipped` + `dueStatus`. 3. `skipTask` + undo. 4. UI. 5. `npm test`, `npm run build:pages`, commit.

## Test plan
Daily/weekly/weekday skips write only the two fields; guards (member, readonly, once, done); undo restores; dueStatus; card tag + button visibility.

## Rollback
Revert the PR. Stray `skippedAt` values are harmless (ignored unless equal to `lastDone`).
