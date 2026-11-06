# Plan — #300
Files: `src/utils.js` (`isOffNow`, `dueStatus`), `src/seasonal.js` (new: `checkOffExpiry`), `src/tasks.js` (`checkTaskResets` skip, edit field, `saveTask`), `src/render.js` (tag), `src/rollover.js` + `src/main.js` (call `checkOffExpiry`), `CLAUDE.md` (task shape + file list), `tests/seasonal-offuntil.test.js` (new), root files via `npm run build:pages`.
Steps: failing tests committed first -> implement -> CLAUDE.md -> build:pages.
Test plan: dueStatus before/after the date (fake `now`); reset skipped while off; saveTask sets/clears/rejects past or bad dates, non-admin and READONLY write nothing; expiry patch contents (one call, offUntil null, lastDone due today), nothing when still off, no write in READONLY; card tag.
Rollback: revert PR (field is optional).
