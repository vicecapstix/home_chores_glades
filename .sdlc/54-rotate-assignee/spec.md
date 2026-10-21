# Spec — #54 Auto-rotate chore assignee on reset

## Behaviour
- A recurring task may have `rotation: [names]` (2+ members). When the task resets (done -> not done, in `checkTaskResets`), `person` advances to the next name in the list (wraps; unassigned or not-in-list starts at the first). Names of removed members are skipped; fewer than 2 valid names = no rotation.
- Admin edit card: "Rotate on reset" member checkboxes (shown when there are 2+ members). Picking 2+ saves `rotation`; fewer clears it.
- Not rotated: paused families (resets are frozen), one-off tasks, tasks that are not yet due.

## UI states
- Admin: sees and edits the rotation chips. Member: no edit UI (edit is admin-only), sees the assignee change on reset. Read-only TV: no writes; shows the current assignee as usual.

## Data shape (/state)
`tasks/<id>/rotation`: string[] (optional, ≤ member count). The reset adds `tasks/<id>/person` to the existing multi-path reset update (no extra requests). Member removal / rename keep `rotation` consistent (removal filters it; `renamePaths` rewrites it).

## Security / RBAC
Edit/save keep their `READONLY` / `isAdminFn` guards. The reset write path is the existing guarded `patchRoot`. Names are escaped with `esc()` in the chips. Rules file needs no change (extra task keys are allowed).

## Cost guardrail check
No new services or deps; one extra path per rotated task in the existing reset update; array bounded by member count.

## Flagged concerns
Several devices may reset at once: all compute the same next person from the same snapshot, so they write the same value (idempotent). If a device is offline across several resets it advances only once per reset it observes.
