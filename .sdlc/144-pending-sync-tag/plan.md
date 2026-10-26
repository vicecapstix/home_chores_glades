# Plan #144

## Files
- `src/pending.js` (new): tracker, tag HTML, retry.
- `src/firebase.js`: wrap `patchTask` / `patchSubtask` in `trackWrite`.
- `src/render.js`: add `syncTagHTML(t.id)` to the card meta row.
- `src/connection.js`: `setPendingCount`, banner text.
- `src/main.js`: handler wiring, `window.retrySync`.
- `src/style.css`: `.tag-sync`, `.tag-sync-fail`.
- `CLAUDE.md`: list new module (docs test requires it).
- `tests/pending-sync.test.js`: delayed/rejected mocked writes, retry, banner.
- Root build files via `npm run build:pages`.

## Rollback
Revert the PR; no data changes.
