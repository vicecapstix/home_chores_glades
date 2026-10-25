# Spec: #179 theme follows the device (Auto / Light / Dark)

## Behaviour
- The header theme button cycles Auto -> Light -> Dark -> Auto. Icon shows the current setting (🌓 / ☀️ / 🌙); title and aria-label read "Theme: Auto. Tap for Light".
- Auto (default when nothing saved) follows `prefers-color-scheme` live via a `matchMedia` change listener.
- Inline script in `src/index.html` resolves the theme (explicit value, else the media query) before first paint, so no flash, and sets `meta[name=theme-color]` (#1A1A18 dark, #2D6A4F light).
- Saved `fc_theme` = 'light' / 'dark' keep their meaning. Any other value is Auto. 'auto' is stored once the user cycles back to it.
- `src/theme.js` holds the logic; `ui.js` `toggleTheme` / `syncThemeButton` delegate so `main.js` wiring is unchanged.

## UI states
- Admin, member and readonly TV all show the button (it was already visible everywhere). A TV in Auto follows the TV's night mode.

## /state data changes
None. localStorage only (per device).

## RBAC
No writes to the database; no guards needed.

## Cost guardrails
No Firebase usage, no deps, no services.

## Concerns
- Existing users who never chose a theme move from always-light to Auto (the requested default).
- The button icon now shows the current setting, not the one you switch to.
