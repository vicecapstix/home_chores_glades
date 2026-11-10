# Plan — #313

Files: `src/utils.js` (validPoints, taskPoints), `src/index.html` (new-points input), `src/tasks.js` (addTask, editTask, saveTask), `src/ui.js` (templateTask, applyTemplate), `src/chorefile.js` (build + validate), `CLAUDE.md` (task shape), `tests/custom-points.test.js`, root deploy files.

Steps
1. Failing tests committed first (8 of 10 fail on main).
2. utils: `POINTS_MIN/MAX`, `validPoints`, override in `taskPoints`.
3. Add form input + addTask spread + reset; edit card input + saveTask set/clear + path.
4. Templates and chore file keep/validate the field.
5. CLAUDE.md task shape; `npm test`; `npm run build:pages`.

Rollback: revert the PR. Tasks with the field simply fall back to the formula if the code is reverted.
