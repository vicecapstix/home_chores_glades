# Plan: #36

## Files
- `src/style.css` - `--accent-fg` token (both themes), 44 px rule in the <=480 px block.
- `src/ui.js` - `toastDuration`, used by `showToast`; `aria-pressed` in `setLbTab` / `setStatsTab`.
- `src/history.js`, `src/render.js`, `src/index.html` - `aria-pressed` on pills; render.js also does focus capture/restore.
- `src/a11y.js`, `src/main.js` - `adjacentCheck`, `initCardArrowNav`.
- `tests/a11y-targets.test.js` - one test group per acceptance criterion.
- Root deployed files via `npm run build:pages`.

## Steps
1. Implement the above. 2. Tests. 3. `npm test`, `npm run build:pages`. 4. PR.

## Rollback
Revert the PR; there is no data or schema change.
