# Plan: #178

## Files
- `src/install.js` (new), `src/main.js` (init + window handlers), `src/index.html` (button, hint), `src/style.css`.
- `src/public/manifest.webmanifest` - shortcuts.
- `src/utils.js` `viewFromSearch`, `src/render.js` uses it in `_applyMineDefault`.
- `CLAUDE.md` - list install.js.
- `tests/pwa-install.test.js`.
- Root files (index.html, manifest.webmanifest) via `npm run build:pages`.

## Rollback
Revert the PR; localStorage key `fc_ios_hint` becomes unused. No data change.
