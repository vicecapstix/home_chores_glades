# Spec — #314 Weekday chores every 2, 3 or 4 weeks

## Behaviour
Weekdays chores gain optional `everyWeeks` (2–4; 1/absent = every week) and `weekAnchor` (Monday `YYYY-MM-DD` of an "on" week). `weekIsOn(t, ms)` is true when the whole weeks (Mon–Sun, local) between the anchor's week and the week containing `ms` are a multiple of `everyWeeks`; always true when unset/invalid. Week arithmetic uses `Date.UTC` of the local Y-M-D so DST changes cannot shift it.
- `prevScheduledStart(days, now, sched)` only counts days in on-weeks (looks back up to `7 × everyWeeks` days). Because due status (`baseStatus`) and resets (`checkTaskResets`) are both built on it, off-weeks are never due and never reset; an unticked chore from an on-week stays overdue until ticked, as today.
- `dueTimePassedToday`, `weekPlan` and the print chart's `dueDays` skip off-weeks.
- Label: `Tue · every 2 wks`.
- Anchor is set to the current week's Monday when saved with N ≥ 2 (Add, Edit when N changed or no valid anchor, template apply, chore-file upload). Editing days only keeps the anchor so the phase does not flip. Templates and chore files store only `everyWeeks`.

## UI states
- Admin: "Every week / 2 / 3 / 4 weeks" select, shown only when frequency is Specific days (Add form and Edit card).
- Member / readonly TV: label on the card; due/overdue, planner and print follow the on-weeks.

## Data shape (/state/tasks/<id>)
Optional `everyWeeks: 2|3|4` and `weekAnchor: 'YYYY-MM-DD'`; omitted when 1; cleared with `null` on edit. No migration.

## Security / RBAC
`addTask`/`saveTask` keep `if (READONLY || !isAdminFn()) return;`. Values are coerced with `validEveryWeeks`/`validDateStr` wherever read (task, template, uploaded file); only rendered as text via `esc`/numbers.

## Cost guardrails
Two small optional fields per task; no new reads/writes/services/dependencies.

## Concerns
Changing a chore from every week to every N weeks mid-week anchors on the current week (this week stays on).
