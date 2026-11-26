# Plan — #394
Files: `src/pocketmoney.js` (regex), `tests/pocketmoney-leading-dot.test.js` (new), root deploy files via `build:pages`.
Steps: 1) failing test first; 2) regex `^(\d+(\.\d{1,2})?|\.\d{1,2})$`; 3) test + build; 4) build:pages.
Test plan: accept/reject table from the issue; stored value is a number.
Rollback: revert the merge commit.
