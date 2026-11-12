# Plan #333
Files: src/claims.js (~4 lines), tests/claim-double-tap.test.js, root deploy files.
Steps: failing test committed first -> add flag with try/finally -> npm test, build:pages.
Test plan: second tap while saving ignored (one patchRoot); guard released after a failed save.
Rollback: revert the PR.
