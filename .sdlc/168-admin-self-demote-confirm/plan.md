# Plan #168
- src/members.js: `toggleRole` takes `currentMemberFn`, confirms self-demote, returns boolean; new `toggleRoleInPanel` (await, then reopen or close+toast).
- src/main.js: `window.toggleRoleInPanel`; panel Toggle button uses it.
- Tests: tests/self-demote.test.js (cancel, confirm, other member, promote, last admin).
- Rollback: revert the PR (no data change).
