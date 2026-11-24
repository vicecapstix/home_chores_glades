# Plan: #401

## Files
- `src/quiethours.js` (new): config, `inQuietHours`, held flag, toggle button.
- `src/notifications.js`: gate the three notification paths, one summary on wake.
- `src/index.html`, `src/main.js`: button and `window.toggleQuietHours`.
- `CLAUDE.md` file list, `tests/quiet-hours.test.js`, root files via `npm run build:pages`.

## Steps
1. Docs. 2. Module + gate + tests. 3. Button. 4. `npm test` (also under a night-time TZ), `npm run build:pages`.

## Test plan
Fake timers at 20:59 / 21:00 / 06:59 / 07:00; across-midnight window; off; one summary on wake (not N notifications); to-check suppressed then fires; held flag cleared; corrupt storage falls back to the default.

## Rollback
Revert the PR; localStorage keys are ignored by older code.
