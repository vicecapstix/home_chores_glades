# Plan — #225
Files: src/doublepoints.js (new), src/tasks.js (multiplier on check), src/render.js (banner + card pts), src/state.js, src/main.js (snapshot field, handlers, admin panel), src/cache.js, src/index.html (banner), src/style.css, tests/double-points.test.js, root build files.
Steps: 1) module + pure tests; 2) wire tasks/state/main/render; 3) banner + CSS; 4) full test + build:pages.
Test plan: one test per acceptance criterion + READONLY/non-admin write paths.
Rollback: revert PR; delete `state/doublePoints` is not needed (ignored when code absent).
