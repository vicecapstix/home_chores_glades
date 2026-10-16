# Intent — #43 Completing an 'Anyone' task awards no points and records no history

(Copied from issue #43)

## Problem
For unassigned ('Anyone') tasks the completion has no `person`, so nobody gets points and Stats/history miss it (`toggleTask` in `src/tasks.js`).

## Outcome / acceptance criteria
- [ ] When an 'Anyone' task is ticked, the logged-in member gets the points (`lastDoneBy` = that member, `lastDonePoints` set) and a history entry
- [ ] Unchecking reverses both
- [ ] Setup mode (no members) or no logged-in member: no points, no crash
- [ ] Tests

## Affected users
Members, admin (stats), TV leaderboard.

## Constraints
Cost guardrails (GitHub Pages + Firebase Spark, no new services, history cap 500, mocks only in tests).

## Open questions
Resolved (JT, 14 Oct): the logged-in member who ticks it gets the points.

## Verification
`npm test` passes (including new tests) and `npm run build` succeeds.
