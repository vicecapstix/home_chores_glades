# Plan — #37

Files: `src/modals.js`, `src/main.js` (admin panel), `tests/modals.test.js`, `.sdlc/37-*`, rebuilt root files.

Steps: 1) failing tests; 2) modals.js history sync; 3) admin panel via modal manager; 4) `npm test`, `npm run build:pages`.

Test plan: history.back once on close; none when not open; idempotent open; Back closes top; echo popstate ignored; closeAll uses go(-n); admin panel source uses openModal/closeModal.

Rollback: revert the PR; no data impact.
