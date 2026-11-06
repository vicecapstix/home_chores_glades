# Spec — #300
**Behaviour:** optional task field `offUntil` (`YYYY-MM-DD`, inclusive, local date). While `today <= offUntil` the chore is *off*:
- `dueStatus` reports it as `ok` (not due, not overdue) unless done; `checkTaskResets` skips it.
- the card shows a muted `💤 Off until <d Mon>` tag.
- Admin sets/clears it with a date field in the chore's edit card; a missing, malformed or past date clears it.
- After the date, `checkOffExpiry` (called from the snapshot handler and the rollover tick, like `checkPauseExpiry`) switches it back on with ONE `patchPaths`: `tasks/<id>/offUntil: null` and, for non-one-off chores, `tasks/<id>/lastDone: initialLastDone(task)` so it is due that day. Skipped in READONLY, so the TV just renders.

**UI states:** admin — date field in Edit + tag; member — tag only; readonly TV — tag only, no writes, no controls.
**Data:** `/state/tasks/<id>/offUntil` (one short optional string); removed on resume. `lastDone` is rewritten only at the switch-back moment (same idea as pause resume). No new collections; no rules/auth/PIN/CI/dependency change; nothing existing is reshaped.
**Security/RBAC:** set/clear lives in `saveTask` (already `READONLY || !isAdminFn()` guarded). Automatic switch-back may run on any editing client (as pause expiry does) and only touches chores whose date has passed.
**Cost guardrails:** one granular patch per expiry; client-side only; no scheduled backend.
**Out of scope (#301):** collapsed "Off" section, early switch-on button, goal/planner/print-chart exclusions, blocking ticks.
