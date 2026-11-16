# Plan — #346

**Files:** src/render.js (class), src/style.css (`.swap-btn` rules), tests/swap-button-member.test.js, root deploy files.
**Steps:** 1. Commit failing test. 2. Change class + CSS. 3. `npm test`, `npm run build:pages`, commit.
**Test plan:** render card as member; assert swap button is not matched by any member-hide selector in style.css; other users' / done / READONLY cases; Edit/Skip still matched.
**Rollback:** revert the PR.
