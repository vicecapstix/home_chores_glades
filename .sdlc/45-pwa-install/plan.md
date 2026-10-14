# Plan — #45
Files: src/public/{manifest.webmanifest,sw.js,icon.svg,icon-192.png,icon-512.png}, src/pwa.js, src/index.html (link/meta), src/main.js (register), package.json (postbuild:pages), root copies, tests/pwa.test.js. Steps: assets -> pwa.js -> wiring -> tests -> build/verify dist output. Rollback: revert PR; SW can be unregistered by deploying a self-unregistering sw.js.
