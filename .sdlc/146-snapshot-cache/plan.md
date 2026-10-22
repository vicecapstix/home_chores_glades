# Plan — #146

Files: `src/cache.js` (new), `src/firebase.js` (`_live` flag + `setWritesEnabled`), `src/main.js` (load/save/banner/clear), `src/index.html` (banner, button), `src/style.css`, `tests/offline-cache.test.js`, rebuilt root `index.html`.

Steps: 1) cache module; 2) write gate; 3) bootstrap wiring + UI; 4) tests; 5) build:pages.

Tests: trim/no pinHash, size cap, storage failure, banner, main wiring order, write gate with mocked firebase, logout untouched.

Rollback: revert the PR; stale `familyflow-snapshot-v1` key is harmless.
