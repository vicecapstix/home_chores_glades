# Plan — #233

## Files
- src/starter.js (new): STARTER list, `openStarter`, `closeStarter`, `toggleStarterCat`, `addStarterChores`.
- src/index.html: "Add from list" button; `#starter-modal`.
- src/style.css: modal layout + `.hidden` pair, small list styles.
- src/main.js: window handlers.
- src/render.js: empty-state prompt for admin.
- tests/starter.test.js (new).
- root deploy files via `npm run build:pages`.

## Steps
1. starter.js + tests (validity, add, skip existing, guards).
2. Modal + button + handlers + CSS.
3. Empty-state prompt.
4. `npm test`, `npm run build:pages`.

## Rollback
Revert the PR. Chores already added are ordinary tasks.
