# Plan — #55
Files: `src/tasks.js` (moveOrders, moveTask; remove initDragDrop), `src/render.js` (buttons, available sort, reorder toggle), `src/main.js`, `src/index.html`, `src/style.css`, `tests/reorder.test.js`, adjust `tests/rbac.test.js` (drag-drop tests -> moveTask guard).
Steps: pure `moveOrders` + tests; `moveTask`; UI; build:pages.
Rollback: revert PR; `order` data unchanged in shape.
