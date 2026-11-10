# Plan — #310

Files: `src/connection.js`, `src/main.js`, `tests/offline-local-events.test.js` (new), root deploy files.

Steps
1. Failing tests committed first.
2. connection.js: `let connectedNow = null;` set in `setConnection`; export `isDisconnected()`; `markSynced` returns early when disconnected; reset in `_resetForTests`.
3. main.js: import `isDisconnected`; guard `saveSnapshot`.
4. `npm test`, `npm run build:pages`.

Test plan: local event offline keeps time; reconnect updates; isDisconnected states; main guard present.

Rollback: revert the PR; no data changes.
