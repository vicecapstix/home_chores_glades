# Plan — #216

## Files
- src/writegate.js (new), src/firebase.js (use gate; adjustMemberPoints 'offline'),
  src/tasks.js (toggleTask, addTask, saveTask), src/redemptions.js, src/ui.js (templates),
  src/teamgoal.js, src/index.html (cache banner text), CLAUDE.md (module list),
  tests/offline-writes.test.js, root deploy files.

## Steps
1. Failing tests (committed first): with gate off, requestReward doesn't toast "Not enough points" / spend; saveTemplate shows no success toast; toggleTask doesn't mutate; adjustMemberPoints reason 'offline'; banner text.
2. Implement gate + guards; tests pass unedited.
3. npm test, build:pages, commit root files.

## Rollback
Revert the PR; no data changes.
