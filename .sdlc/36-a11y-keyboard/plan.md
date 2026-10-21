# Plan — #36

Files: `src/render.js` (checkbox markup, aria sync), `src/a11y.js` (new), `src/main.js` (init call), `src/style.css` (button reset, hit areas), `tests/a11y-keyboard.test.js`, `.sdlc/36-*`, rebuilt root files.

Steps: 1) failing tests; 2) markup change; 3) a11y.js + wire in main.js; 4) CSS; 5) `npm test`, `npm run build:pages`.

Test plan: button/role/aria-checked/label for the three checkboxes; aria sync on select; Esc closes top dialog; focus in/out; Tab trap. Native Enter/Space on buttons is browser behaviour.

Rollback: revert PR; no data impact.
