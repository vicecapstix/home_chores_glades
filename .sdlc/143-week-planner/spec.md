# Spec: week planner (#143)

## Behaviour
- Header button 🗓 opens `#week-modal` (standard modal pattern). Mon-Sun sections; stacked on phones, 7 columns >= 900px; today highlighted with a "Today" badge.
- `weekPlan(tasks, now)` (utils.js) returns 7 `{date, dow, isToday, paused, items[]}`:
  - weekdays: on selected days; daily: every day.
  - weekly / fortnightly / monthly / interval: once, on `lastDone + cycleDays`; overdue ones sit on today; due dates outside this week are omitted.
  - once: on `dueDate` (overdue -> today); done or dateless one-offs omitted.
  - Days from today to `pause.until` are `paused` and empty. Items sorted by due time then name; each has person + dueTime + done-today flag.
- Items show time, name, assignee chip (avatar + member colour; "Anyone" when unassigned). All user text through `esc()`.

## UI states
- Admin / member: identical, display only. Readonly TV: same modal, larger text via `body[data-readonly]`; Esc closes (a11y.js).

## Data / RBAC / cost
- No /state changes, no writes, no extra reads (uses already-synced `state.tasks`). No guards needed. Spark-plan safe.

## Concerns
- Projections beyond the next due date (e.g. a weekly chore next week) are deliberately not shown; they depend on when it is completed.
- The TV remote cannot press the header button; the TV auto-cycle (#148) is the way to show it there later.
