# Plan #169
- src/render.js: add `syncViewToMember()`; src/main.js: call it in the login callback before render().
- Tests: tests/switch-user-reset.test.js (switch resets view; same member keeps it).
- Rollback: revert the PR (no data change).
