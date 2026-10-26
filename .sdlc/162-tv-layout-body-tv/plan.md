# Plan #162

Files: `src/style.css` (TV block), `tests/tv-layout.test.js` (new), root `index.html` (build:pages).
Steps: rewrite TV media block keyed on `body.tv`; drop old goal 1200px block (merged); add CSS tests; `npm test`; `npm run build:pages`.
Tests: breakpoint, 2/3 columns, font size, overflow guard, old rules gone, no leakage below 900px.
Rollback: revert the PR; CSS only, no data impact.
