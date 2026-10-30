# Spec: recurring chores are 'Due soon' on their due day (#222)

## Behaviour
- For `daily`, `weekly`, `fortnightly`, `monthly` and `interval` chores, `baseStatus` (src/utils.js) compares calendar days since `lastDone` (`s`) with the cycle length (`d`):
  - `s > d` → `overdue` (was `s >= d`)
  - `s >= d - 1` → `soon` (unchanged: the day before and the due day)
  - otherwise `ok`
- `weekdays` and `once` chores already behave this way and are untouched.
- A chore with `dueTime` is untouched: `rawDueStatus` still turns it overdue at that moment.
- Notifications (`selectNotifyTasks`), the Overdue filter/count, planner and TV all call `dueStatus`, so they follow without separate changes.
- `todayProgress`: a recurring chore that is now `soon` on its due day must still count as "due today", so the `validTime` condition is dropped from the due-today branch.

## UI states
Admin, member and read-only TV views all show the 'Due soon' tag instead of 'Overdue' on the due day. No new UI.

## Data shape
None. Nothing is written to /state.

## Security / RBAC
No write paths, no new HTML, no new inputs.

## Cost guardrails
Pure client-side date logic. No new services, reads or writes.

## Concerns
A missed daily chore now shows 'Overdue' a day later than before (JT chose this on 26 Oct).
