# Plan: #175

## Files
- `src/restore.js` (new): validation, payload, file/confirm flow.
- `src/backup.js`: `downloadBackup` returns true/false.
- `src/ui.js`: export template caps.
- `src/main.js`, `src/index.html`, `src/style.css`: button, hidden file input, modal.
- `tests/restore.test.js`, `tests/restore-readonly.test.js`.
- `CLAUDE.md`: list new module (docs test requires it). Root build files.

## Steps
1. Implement. 2. Tests (validation, PIN preservation, caps, payload, guards). 3. `npm test`, `npm run build:pages`. 4. PR.

## Rollback
Revert the PR; no data shape changes. A mistaken restore is undone by the safety backup it downloaded.
