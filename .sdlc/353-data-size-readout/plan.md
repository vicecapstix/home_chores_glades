# Plan — #353

**Files:** src/datasize.js (new), src/index.html (button + modal), src/style.css (modal pair), src/main.js (window handler), tests/datasize.test.js, CLAUDE.md file list (one line), root deploy files.
**Steps:** 1. Commit failing tests. 2. Implement. 3. `npm test`, `npm run build:pages`, commit.
**Test plan:** size excludes pinHash and local keys; counts; monthly estimate and stated assumption; amber threshold; admin opens; member/READONLY don't; no firebase import used.
**Rollback:** revert the PR (nothing stored).
