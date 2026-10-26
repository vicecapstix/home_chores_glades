# Plan #163

Files: `src/index.html` (toast markup), `src/style.css` (toast rules + 480px stack), `src/undo.js` (aria-label), `tests/undo-toast-a11y.test.js` (new), root `index.html`.
Steps: markup -> CSS -> aria-label in `_showUndoToast` -> tests -> build:pages.
Tests: live region, button, no inline style, pointer-events CSS, 480px stack, aria-label text.
Rollback: revert PR; UI-only.
