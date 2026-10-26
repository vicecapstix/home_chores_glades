# Plan: TV auto-cycle (#148)

## Files
- `src/config.js` TV_CYCLE; `src/tv.js` createTvCycle/initTvCycle/refreshTvCycle; `src/ui.js` extract exported `leaderboardHTML(tab)` (no behaviour change for the modal).
- `src/main.js` wiring + refresh on snapshot; `src/index.html` `#tv-panel`; `src/style.css` panel + reduced-motion.
- Tests: `tests/tv.test.js` (rotation order, key pause, arrows, escaping, gating), `tests/tv-cycle-readonly.test.js` (no writes). Rebuilt root files.

## Rollback
Revert the PR; opt-in via URL param, so the normal TV view is unaffected meanwhile.
