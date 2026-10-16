# Intent — #33 Week/day boundaries use UTC; weekly leaderboard shows last week's points

(Copied from issue #33)

## Problem
`getWeekStart()` (`src/utils.js`) and several 'today' strings use `toISOString()` (UTC). In UTC+8 the week/day rolls over at 08:00 local, so weekPoints reset mid-Monday and streak/one-off due dates/notifications (`runOverdueCheck` in `src/notifications.js`)/summary shift. The weekly leaderboard (`src/ui.js`) sorts stored `weekPoints` without checking `weekStart`, so last week's points show as 'This week' until that member completes something. `exportCSV` parses date-only strings as UTC.

## Outcome / acceptance criteria
- [ ] A `localDateStr(d)` helper used for every YYYY-MM-DD comparison
- [ ] Leaderboard treats `weekStart !== currentWeekStart` as 0 (main view and TV)
- [ ] Tests with mocked timezone/time (e.g. Monday 07:00 in UTC+8)

## Affected users
Members (points, streaks), TV leaderboard.

## Constraints
Cost guardrails (Pages + Firebase Spark, no new services, mocks only in tests).

## Open questions
None.

## Verification
`npm test` and `npm run build` pass.
