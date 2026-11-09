# Plan — #312
Files: `src/pwa.js` (versionTag, watchForUpdates, reloadWhenIdle), `src/modals.js` (anyModalOpen), `src/main.js`, `src/index.html` (banner), `src/style.css`, tests (`update-watch.test.js`, pwa mock in main-bootstrap test), root files via build:pages.
Test plan: one test per acceptance criterion (see PR table). Rollback: revert the PR; nothing stored server-side.
