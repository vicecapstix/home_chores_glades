# Plan #32
Files: src/tasks.js (toggleTask, new undoCompletionRecords), tests/uncheck-restore.test.js (new, 6 tests), root build files.
Steps: failing tests -> implement -> npm test -> build:pages.
Test plan: in-memory fake of the firebase helpers; check/uncheck/check; same-day second completion keeps streak; legacy task without prevLastDone.
Rollback: revert PR; extra prev* task fields are ignored by older code.
