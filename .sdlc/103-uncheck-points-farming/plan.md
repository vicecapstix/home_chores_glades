# Plan — #103

## Files
src/firebase.js (`adjustMemberPoints`), src/tasks.js (`toggleTask`), tests/points-transaction.test.js (new), existing tests that mock firebase.js for toggleTask (tasks, anyone-points, others as needed), root deploy files.

## Steps
1. Docs + failing test commit. 2. Helper. 3. toggleTask rewrite (uncheck: transaction first, then task patch; check: patch task, transaction, then streak/badges via patchMember). 4. Update existing mocks/assertions. 5. test, build:pages, PR.

## Test plan
In-memory fake RTDB: check -> spend -> uncheck (member refused, admin negative); concurrent spend not overwritten; last-week uncheck leaves this week's points.

## Rollback
Revert the PR; `lastDoneWeek` is ignored by old code.
