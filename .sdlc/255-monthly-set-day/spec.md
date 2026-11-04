# Spec: monthly chores on a set day (#255)

## Behaviour
- New optional task field `monthDay`: an integer 1-28 or the string `'last'`. Only meaningful when `freq === 'monthly'`. Absent = today's behaviour (a calendar month after last done, #137).
- With `monthDay`, the cycle that starts at `lastDone` ends on the first occurrence of that day strictly after the day of `lastDone` (`'last'` = the last day of that month, so 28/29 Feb). `cycleDays()` is the single hook, so `dueStatus`, resets (`checkTaskResets`), due-time, This week planner, and "due today" all follow with no extra code.
  - Example: `monthDay 15`, done 15 Sep: ok to 13 Oct, `soon` on 14 and 15 Oct, `overdue` from 16 Oct (consistent with #222), resets on 15 Oct once done. Done late on 16 Oct: next due 15 Nov.
- New chores (form, template, starter, chore file) start from the last occurrence before today, so they are due on the next set day and never instantly overdue.
- Card tag reads "monthly · 15th" / "monthly · last day". Print chart marks the weekday of the printed week that falls on the day (none that week = no row). Planner places it on the day.
- Helpers in `utils.js`: `validMonthDay`, `monthDayLabel`, `nextMonthDayDate`.

## UI states
- Admin: Add form and edit card show an "On day" select (Any day, On the 1st ... 28th, On the last day) only when Monthly is chosen; blank keeps today's behaviour. Changing frequency away from monthly drops the field.
- Member: sees the card label only; no form (form is admin-only, `isAdminFn` guard unchanged).
- Read-only TV (`?readonly=1`): label and due status only; add/edit/save already return on `READONLY`.

## Data shape
`/state/tasks/<id>/monthDay`: optional number 1-28 or `'last'`. Additive, no migration. Old clients ignore it (they would treat the chore as plain monthly).
Validated (`validMonthDay`, otherwise dropped) in: add, save, templates (save + apply), starter `makeTask`, chore-file build + upload (invalid value rejects that chore), and backup restore (tasks and template tasks; also dropped when `freq !== 'monthly'`).

## Security / RBAC notes
Admin-only writes via existing guards (`READONLY || !isAdminFn()`). No rules, auth or PIN changes. Write goes through `patchPaths` with the same path set as other task fields. Restore now normalises `monthDay` (mention for review).

## Cost-guardrail check
One extra tiny field per task; no new listeners, reads, services, deps or secrets. Stays on GitHub Pages and the Spark plan.

## Flagged concerns
- Completing a set-day chore early (e.g. 10 Oct for a 15th chore last done 15 Sep) makes the next cycle end on 15 Oct, i.e. due again 5 days later. Accepted for this slice; a later change could skip an occurrence already covered.
- Follow-ups (not in this PR): none required; Last-day option covers 29-31.
