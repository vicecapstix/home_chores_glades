# Plan (#234)

## Files
- `src/chorefile.js` (new): `buildChoreFile`, `choreFilename`, `downloadChores`, `validateChoreFile`, `addPayload`, `prepareChoreUpload`, `confirmChoreUpload`, `cancelChoreUpload`.
- `src/starter.js`: extract `makeTask(s, id, base, n)` (also used by `addStarterChores`; output unchanged for built-in chores).
- `src/index.html`: two Admin Panel buttons, hidden file input, `#chores-upload-modal`.
- `src/style.css`: modal layout + hidden rule pair.
- `src/main.js`: import + `window.*` handlers.
- `tests/chore-file.test.js`, `tests/chore-file-readonly.test.js` (new).
- CLAUDE.md file list and README feature/how-to lines.
- Root deploy files via `npm run build:pages`.

## Steps
1. Design docs, then tests (one per acceptance criterion, plus READONLY / non-admin).
2. `makeTask` refactor; `chorefile.js`; wiring; markup.
3. `npm test`, `npm run build:pages`.

## Rollback
Revert the PR. It only adds new `tasks/<id>` entries on upload; added chores can be deleted in the app.
