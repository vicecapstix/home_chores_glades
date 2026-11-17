# Plan: #356

## Files
- `src/textsize.js` (new): get/apply/cycle/init, URL param.
- `src/main.js`: `initTextSize()`, `window.cycleTextSize`. `src/index.html`: `#textsize-btn`. `src/style.css`: root classes, body `1rem`, button size.
- Tests: `tests/textsize.test.js`; `tests/a11y.test.js` header button count 14 -> 15; CLAUDE.md module list.
- Root `index.html` rebuilt with `npm run build:pages`.

## Test plan
Cycle order, default, class + label, persistence, unknown value, blocked storage, URL param (not stored, beats stored), no Firebase import, CSS wiring. `npm test`, `npm run build`, headless overflow check at 360px/1280px.

## Rollback
Revert the PR; the saved key is harmless.
