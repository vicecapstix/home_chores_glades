# Plan — #297
Files: `src/utils.js` (TIMES_OF_DAY, validTimeOfDay, timeOfDayLabel), `src/tasks.js` (addTask, editTask, saveTask), `src/index.html` (Add select), `src/render.js` (tag), `src/ui.js` (templateTask, applyTemplate), `src/chorefile.js` (build + validate), `CLAUDE.md` (task shape), `tests/time-of-day-field.test.js` (new), root files via `npm run build:pages`.
Steps: failing tests committed first -> implement -> CLAUDE.md -> build:pages.
Test plan: add/edit keep, clear and reject bad value; non-admin writes nothing; template + chore-file round trips; cardHTML tag and escaping of bad value; READONLY shows tag only.
Rollback: revert PR (field is optional, so older data is unaffected).
