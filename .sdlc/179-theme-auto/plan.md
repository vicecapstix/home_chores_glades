# Plan: #179

## Files
- `src/theme.js` (new) - setting, resolve, cycle, apply, `initTheme` with live listener.
- `src/ui.js` - `toggleTheme` / `syncThemeButton` delegate to theme.js.
- `src/index.html` - inline restore script handles Auto and meta theme-color; button default label.
- `CLAUDE.md` - list theme.js.
- `tests/theme-auto.test.js` - cycle, mocked media query, legacy values, inline script.
- Root files via `npm run build:pages`.

## Rollback
Revert the PR. Saved 'light'/'dark' values stay valid for the old code ('auto' is read as light there).
