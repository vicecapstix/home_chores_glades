# Plan (#388)
Files: src/firebase.js (resetTasks), src/tasks.js (checkTaskResets: disconnected guard, collect `seen`, call resetTasks), tests: new tests/stale-reset.test.js; existing reset tests (granular, recurring-reset, rollover, rotation) assert resetTasks instead of patchRoot.
Steps: failing tests first; implement; npm test/build; build:pages.
Test plan: disconnected -> no write; transaction aborts when server lastDone differs or task already not done; applies when equal incl. subtasks and rotation; READONLY.
Rollback: revert the PR (same leaves as before).
