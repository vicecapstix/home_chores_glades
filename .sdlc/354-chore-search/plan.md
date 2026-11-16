# Plan — #354

**Files:** src/render.js (query state, `matchesSearch`, filter, empty text, clear), src/index.html (input row), src/style.css, src/main.js (window handlers), tests/chore-search.test.js, root deploy files.
**Steps:** 1. Implement. 2. Tests per criterion. 3. `npm test`, `npm run build:pages`, commit.
**Test plan:** name/notes case-insensitive match; combines with Mine, category, status; empty message; clear and Esc; hidden/ignored on READONLY; label present; query cleared on member switch.
**Rollback:** revert the PR (nothing stored).
