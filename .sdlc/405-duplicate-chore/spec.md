# Spec — #405 Duplicate a chore (admin "Copy")
## Behaviour
In the admin edit view of a chore there is a **Copy** button. `duplicateTask(id, isAdminFn)` creates a new chore with the same settings (freq, days, everyWeeks/weekAnchor, interval, person, difficulty, category, notes, due time, icon, points override, minutes, time of day, needsCheck, rotation, offUntil) and the name `"<name> (copy)"` (cut to 60 chars). It is not done, `lastDone` is reset via `initialLastDone`, and it carries none of: lastDone* / prev* fields, skippedAt, checkPending, checkNote. Subtasks are copied by name with fresh ids and `done:false`. One multi-path add writes `tasks/<newId>` and `nextId`. An undo toast removes the copy. The edit card stays open on the original.
## UI states
Admin: Copy button next to Save/Cancel. Member: no edit view, so no button; `window.duplicateTask` is also guarded. Readonly TV: no edit view; function returns early on READONLY.
## Data shape
No new fields; a new task in the existing `/state/tasks` shape.
## Security / RBAC
`if (READONLY || !isAdminFn()) return;` first line. `isAdminFn` passed from main.js, not imported. Task id goes through `jsq()` in the inline onclick; no user text is added to HTML.
## Cost guardrails
One small multi-path write; no new services, deps, secrets; tasks are not capped but one add is one chore.
## Flagged concerns
None. Does not touch restore, rename, rules, auth or CI.
