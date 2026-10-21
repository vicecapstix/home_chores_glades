# Plan — #104
Files: `src/tasks.js` (shared `ownershipBlock`, 3 guards), `src/main.js` (wire fns), `tests/anyone-guards.test.js` (new), call-site updates in `tests/{rbac,render-preserve,weekdays}.test.js`, root deploy files.
Steps: failing tests -> implement -> build:pages. Test plan: 9 new tests (member/admin/readonly paths). Rollback: revert PR.
