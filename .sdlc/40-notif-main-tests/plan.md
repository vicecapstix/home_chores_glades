# Plan (#40, partial)
Files: `tests/notifications-daily.test.js`, `tests/main-bootstrap.test.js` (new). No `src/` change, so root deploy files don't change.
Steps:
1. Notifications: fake timers, stub `Notification`, run via `initNotifications` so the real 30-min interval is exercised.
2. main.js: `vi.mock` the Firebase SDK, `firebase.js` (initFirebase/initAuth/setWritesEnabled), `cache.js`, `render.js`, `tasks.js` (checkTaskResets), `auth.js` (handleFirstLoad), `pwa.js`, `connection.js`; record call order; `vi.resetModules()` per test so `READONLY` is re-read from `?readonly=1`.
3. Mutation-check both files, then `npm test`, `npm run build`, `npm run build:pages` (expect no root change).
Rollback: delete the two test files.
