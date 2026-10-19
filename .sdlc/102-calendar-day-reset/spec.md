# Spec — #102

## Behaviour
- New `daysSince(ts, now)` counts local calendar days between `ts` and `now` (DST-safe: compares local y/m/d via `Date.UTC`), ignoring time of day.
- `checkTaskResets` resets daily/weekly/fortnightly/monthly tasks when `daysSince(lastDone) >= freqDays`. Daily therefore resets at local midnight.
- `dueStatus` base status uses the same rule (`>= d` overdue, `>= d-1` soon), so status and reset agree. The `dueTime` deadline date (lastDone local date + freqDays) is already calendar-based and unchanged.
- `initialLastDone` steps back whole local calendar days so new tasks behave as before across DST.
- `weekdays` and `once` unchanged.

## UI states
Admin / member / readonly TV: no new UI. Cards and TV due lists flip at local midnight (visible live once #88's timer lands).

## Data shape
None. No migration.

## Security / RBAC
No new writes; reset path unchanged (READONLY guard retained, multi-path patch).

## Cost guardrails
No new services, deps, reads or writes. Free tier unaffected.

## Concerns
Tasks done late evening now reset sooner (intended). The device time zone defines "midnight".
