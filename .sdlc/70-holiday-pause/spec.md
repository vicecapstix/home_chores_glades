# Spec — #70 Holiday / pause mode

## Behaviour
- Admin opens Admin Panel -> "Pause the house", picks an end date (today or later), taps Pause. Writes `state/pause = { until, by, since }` (one patchRoot). "Resume now" clears it.
- While paused (local date <= `until`): `dueStatus` returns `ok` for every undone task (nothing overdue/soon); `checkTaskResets` does nothing; overdue notifications and the daily summary see nothing overdue (both use `dueStatus`). Tasks can still be ticked.
- Banner "Paused until Sun 25 Oct" under the header on every view, including TV.
- Resume (admin clears, or any non-readonly client loads after `until` has passed): one `patchRoot` multi-path update sets `pause: null`, shifts `lastDone` of recurring tasks (not `once`) last done before `since` forward by the paused duration (capped at now), and shifts members' `lastStreakDate` (if before the pause start) forward by the paused whole days (capped at today) so streaks survive.

## UI states
- Admin: pause form + Resume button in Admin Panel, plus banner. Member: banner only. Readonly TV: banner only, no controls, never writes.

## Data shape
`/state/pause: { until:'YYYY-MM-DD', by:'<member>', since:<ms> }` or absent. `writeState` carries `pause` so a full write cannot wipe it.

## Security / RBAC
`setPause`/`clearPause`: `if (READONLY || !isAdminFn()) return;`. Automatic expiry resume is a maintenance write by any non-readonly client (the admin may not open the app); it only runs once `until` is in the past. Date format validated.

## Cost guardrail check
One small node, one multi-path update on resume. No new services, deps or secrets.

## Concerns
- Two clients loading at the same moment after expiry could both shift (double shift); harmless (chores just due slightly later).
- The TV (readonly) cannot write, so after `until` it shows overdue until another device opens the app.
- Whole-house pause only (per issue).
