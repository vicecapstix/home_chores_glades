# Plan: #355

## Files
- `src/tv.js`: `tomorrowDay`, `tvTomorrowHTML`, `renderTvTomorrow`.
- `src/render.js`, `src/rollover.js`: call `renderTvTomorrow()`.
- `src/index.html`: `#tv-tomorrow` in the header; `src/style.css`: hidden by default, TV rules.
- Tests: `tests/tv-tomorrow.test.js`, `tests/tv-tomorrow-readonly.test.js`.
- Root `index.html` rebuilt with `npm run build:pages`.

## Test plan
Fixed clock before/after 18:00, Sunday, pause, switched-off, empty, escaping, cap, CSS wiring, non-READONLY no-op, READONLY fill/clear. `npm test`, `npm run build`.

## Rollback
Revert the PR; no data changes.
