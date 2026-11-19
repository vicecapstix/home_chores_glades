# Plan: #359
Files: `src/backupreminder.js` (new), `src/backup.js` (record on success), `src/render.js` (call), `src/main.js` (window.dismissBackupReminder), `src/index.html` (banner), `src/style.css` (rule pair + TV/member hide), `tests/backup-reminder.test.js` (new, 10 tests), CLAUDE.md file-structure line, root files rebuilt.
Steps: module + pure status fn, wire up, tests with a fixed clock (29/30/never, snooze, member, READONLY, blocked storage), `npm test`, `npm run build:pages`.
Rollback: revert the PR; localStorage keys are harmless leftovers.
