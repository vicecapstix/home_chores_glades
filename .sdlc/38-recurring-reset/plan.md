# Plan #38
Files: src/tasks.js (checkTaskResets), src/utils.js (doneAgoLabel), src/render.js (labels + tag), tests/recurring-reset.test.js, rebuilt root files.
Steps: failing tests -> implement -> npm test -> build:pages.
Test plan: subtasks reset in one patchRoot (daily + weekdays); not-done and 'once' untouched; rotation still applies; no-subtask tasks fine; doneAgoLabel values; render shows "Done" heading and "3 days ago".
Rollback: revert PR; no data migration.
