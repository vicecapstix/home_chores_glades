# Plan: #400

## Files
- `src/tvscroll.js` (new): `overflowPx`, `hiddenCount`, `stepScroll` (pure), `tvScrollTick`, `initTvScroll`.
- `src/main.js`: call `initTvScroll()` next to `initTvMode()`.
- `src/style.css`: `body.tv .section` cap + sticky head + `[data-more]` label.
- `CLAUDE.md` file list; `tests/tv-autoscroll.test.js`; root files via `npm run build:pages`.

## Steps
1. Docs. 2. Pure helpers + tests. 3. DOM tick + CSS + wiring. 4. `npm test`, `npm run build:pages`.

## Test plan
Helpers at the boundaries (tolerance, pause/scroll/return cycle), reduced-motion label, night hold, non-TV no-op, CSS present only under `body.tv`.

## Rollback
Revert the PR.
