# Spec #182 — printable weekly chart

## Behaviour
- Admin Panel gets a "Print chart" button. It fills a hidden `#print-chart` block and calls `window.print()`.
- Chart: title, week range (Mon–Sun of the current week), one table. Rows = chores grouped by member (then "Anyone"), columns Mon..Sun with an empty square box on each due day.
- Due-day logic (own pure helper `dueDays`, since #143 is not merged): daily = all days; weekdays = chosen days (Sun=0 mapped to last column); once = its `dueDate` if inside the week (otherwise omitted); weekly/fortnightly/monthly/interval have no fixed weekday, so they get a box in an extra "Any day" column.
- `@media print` hides everything except `#print-chart`, landscape `@page`, black borders on white, no colour reliance (A4/Letter fit via 100% width table).

## UI states
- Admin: button visible in Admin Panel. Member: panel is admin-only and `printChart` also guards. Readonly TV: `printChart` returns early.

## Data
- None; computed from local `state.tasks`/members. No Firebase read/write.

## RBAC
- `if (READONLY || !isAdminFn()) return;`.

## Cost guardrails
- None touched; no services or deps.

## Concerns
- "Any day" column is an addition to Mon–Sun so weekly/monthly chores aren't lost; revisit if #143 defines a different convention.
- Paused/holiday mode and skipped tasks are not reflected; chart shows the schedule.
- Print layout was verified by CSS tests only, not a real printer.
