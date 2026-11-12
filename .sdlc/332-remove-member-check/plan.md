# Plan #332
Files: src/members.js (1 line), tests/remove-member-check.test.js, root deploy files (build:pages).
Steps: failing test committed first -> add the one-line fix -> npm test, build:pages.
Test plan: 3 tests (clears own pending check, leaves others', non-admin blocked).
Rollback: revert the PR.
