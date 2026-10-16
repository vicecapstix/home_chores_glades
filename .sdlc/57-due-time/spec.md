# Spec — #57 Optional due time

## Behaviour
- A task may have `dueTime` ("HH:MM", 24h, local). Empty/absent = today's behaviour.
- With a valid `dueTime` and a not-done task, the deadline is a moment (due date at `dueTime`, local): `overdue` from then on, `soon` in the 24 h before, `ok` earlier. Due date: one-off → `dueDate`; daily/weekly/fortnightly/monthly → local date of `lastDone` + the frequency's days; Specific days → on a scheduled day that is today, `soon` before the time and `overdue` after (earlier missed days stay `overdue` as before).
- Without `dueTime` nothing changes (rolling 24 h rule).
- Card shows an "⏰ 19:00" tag next to the frequency tag; the TV view uses the same cards so it shows too.
- Add bar and edit form get a time input; invalid values are stored as empty.

## UI states
Admin: sets/edits time. Member: sees the tag and overdue state (cannot edit). Readonly TV: sees the tag and overdue state.

## Data shape (/state)
`tasks/<id>/dueTime`: string "HH:MM" or "" (new, optional; old tasks unaffected).

## Security / RBAC
Add/save paths keep their existing guards; value validated with `/^([01]\d|2[0-3]):[0-5]\d$/` and rendered through `esc()`.

## Cost guardrails
One small string per task; no new services. Pass.

## Concerns
Status only flips on the next render (renders occur on every data snapshot; there is no per-minute timer), so a TV left idle may show "Due soon" for up to a few minutes past the time until the next sync or refresh. The existing 30-minute notification check picks it up.
