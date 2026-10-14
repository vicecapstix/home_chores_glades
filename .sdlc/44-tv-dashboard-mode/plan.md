# Plan — #44
Files: src/tv.js (new), src/render.js (data-k, strip refresh), src/main.js (init), src/index.html (clock/strip), src/style.css, tests/tv.test.js, .sdlc/44-*.
Steps: 1) tv.js helpers (applyTvMode, formatClock, tvStripHTML, requestWakeLock) 2) markup 3) CSS 4) wire render/main 5) tests 6) npm test + build.
Test plan: unit tests for each helper (wake lock guarded: unsupported, rejects, re-acquire), readonly toggles body.tv, strip HTML escapes names/sorted, CSS contains >=1200px grid + banner static + admin hiding, render emits data-k.
Rollback: revert the PR; live site unaffected until root index.html is regenerated.
