# Plan: due-time reminder (#150)

## Files
- `src/utils.js`: `dueTimePassedToday`. `src/notifications.js`: `runDueTimeCheck`, `selectDueTimeTasks`, per-day flag; `showOverdue` takes an optional tag.
- `src/rollover.js`: call `runDueTimeCheck()` in the existing tick.
- Tests: `tests/notifications.test.js` (6 added), `tests/due-reminder.test.js` (rollover timer, fake timers), `tests/due-reminder-tv.test.js` (READONLY). Rebuilt root files.

## Rollback
Revert the PR; the only persisted artefact is a harmless localStorage key.
