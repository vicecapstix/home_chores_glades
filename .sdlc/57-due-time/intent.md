# Intent — #57 Optional due time for chores (e.g. 'by 7pm')

(Copied from issue #57)

## Problem
Daily chores have no time-of-day; 'due soon' can't reflect 'before dinner'.

## Outcome / acceptance criteria
- [ ] Optional `dueTime` HH:MM; status overdue after time on the due day (works for daily, weekly and 'Specific days')
- [ ] Shown on card and TV
- [ ] Tests

## Affected users
All.

## Constraints
Cost guardrails (Pages + Firebase Spark, no new services, mocks only in tests).

## Open questions
None.

## Verification
`npm test` and `npm run build` pass.
