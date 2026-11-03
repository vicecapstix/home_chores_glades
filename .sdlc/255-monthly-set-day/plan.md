# Plan: monthly set day (#255)

## Files
- `src/utils.js`: `validMonthDay`, `monthDayLabel`, `nextMonthDayDate`; `cycleDays`, `initialLastDone`, `freqLabel` aware of `monthDay`.
- `src/tasks.js`, `src/index.html`, `src/main.js`: "On day" select in add form and edit card; save/patch `monthDay`.
- `src/printchart.js`: weekday marking. `src/ui.js`: template save/apply. `src/starter.js`: `makeTask`. `src/chorefile.js`: build/validate. `src/restore.js`: normalise on restore.
- Tests: `tests/monthly-set-day.test.js`, `tests/monthly-set-day-readonly.test.js`. Docs: README feature line, CLAUDE.md task shape.
- Root deployed files via `npm run build:pages`.

## Steps
1. Docs commit. 2. Due logic + helpers. 3. Form + persistence. 4. Templates/starter/chore file/restore/print chart. 5. Tests, build:pages.

## Test plan
Each acceptance criterion has a test (see PR table): due status around the 15th, 'last' in Feb (incl. leap year), reset timing, label, planner, print chart, template/backup/chore-file/starter round-trips, add/edit/clear, non-admin and READONLY.

## Rollback
Revert the PR. Stored `monthDay` values are ignored by the old code (plain monthly), so no data cleanup needed.
