# Spec — #33 Local dates

## Behaviour
- New `localDateStr(d = new Date())` in `src/utils.js` returns `YYYY-MM-DD` in the device's local time zone.
- `getWeekStart()` (Monday, local), `dueStatus` for one-off tasks (today / tomorrow), streak `today`/`yesterday` in `toggleTask`, the daily-notification key (`notifications.js`) and the daily-summary key (`ui.js`) all use it.
- New `currentWeekPoints(member)` returns `weekPoints` only when `member.weekStart === getWeekStart()`, else 0. The weekly leaderboard (modal) and the TV leaderboard use it for sorting and display.
- `exportCSV` parses `YYYY-MM-DD` from/to as local midnight (`T00:00:00`) instead of UTC.

## UI states
Admin/member leaderboard (This week tab) and readonly TV leaderboard show 0 for anyone who hasn't scored this week. No new controls.

## Data shape
None; stored `weekPoints`/`weekStart` values keep their format (YYYY-MM-DD of the local Monday). Existing UTC-written week starts self-correct on the next completion.

## Security / RBAC
No new write paths.

## Cost guardrails
None affected. Pass.

## Concerns
Devices in different time zones writing `weekStart` could disagree around midnight Monday; acceptable for one household.
