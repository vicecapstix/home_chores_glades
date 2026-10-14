# Plan — #21
Files: src/index.html, src/style.css, src/render.js, src/main.js, tests/a11y.test.js, .sdlc/21-*.
Steps: 1) failing test (committed first) 2) HTML attrs/labels/main/skip link/toast 3) CSS 4) h2 in render.js 5) PIN keyboard listener in main.js 6) npm test + build; compare aria count.
Test plan: tests/a11y.test.js parses src/index.html with DOMParser and asserts modals, button labels, labels, main landmark, toast; reads style.css for sr-only/focus-visible/contrast tokens; render.js h2 check; main.js keydown handler.
Rollback: revert the PR; root index.html untouched so live site unaffected.
