# Plan #274
Files: src/members.js (renamePaths, renameMember), src/firebase.js (renameHistoryPerson), tests.
Steps: failing tests first -> add paths -> add transaction helper -> update old index-path test -> build:pages.
Tests: tests/rename-member-checks.test.js, tests/rename-history-tx.test.js, tests/rename-member.test.js (updated).
Rollback: revert the PR; no data shape change.
