# Plan #165

Files: `src/public/sw.js`, `tests/sw-timeout.test.js` (new), root `sw.js` + `index.html` (build:pages).
Steps: extract `shellResponse(req, keepAlive, timeoutMs)`; bump cache to v3; vm-based tests (fast, slow+cache, slow+no cache, offline, keep-alive).
Rollback: revert PR; next activation of the previous worker deletes the v3 cache.
