# Spec: uncheck after a pause/away finds its history entry (#389)

## Behaviour
- When a chore is ticked, the task also stores `lastDoneAt` = the exact tick time (the same value written to the history entry's `completedAt`). Pause/away resume patches shift `lastDone` only, so `lastDoneAt` stays unshifted.
- Uncheck looks the history row up by `lastDoneAt` (falling back to `lastDone` for chores ticked before this change). The streak "same day" check uses the same time.
- Uncheck clears `lastDoneAt`; a failed-points rollback clears it too.
- Reset freezing is unchanged: `computeResumePatch` / `computeReturnPatch` still shift `lastDone`, so chores do not come back due early.

## UI states
No UI change. Admin/member uncheck now removes the history row; TV leaderboard/team goal stop counting it. Readonly: no write path touched (`toggleTask` already guards).

## Data shape
`/state/tasks/<id>/lastDoneAt` (number, optional, additive). Existing data is not rewritten; absent field falls back to old behaviour.

## Security / RBAC
Unchanged guards (`ownershipBlock`, `isAdminFn`). No new write path, no rules, auth or PIN change. `src/restore.js` untouched.

## Cost guardrail check
One extra number per task; no new collection, no history growth, no new services.

## Flagged concerns
Chores ticked before this ships and then shifted by a pause still can't find their row (no `lastDoneAt`); not fixable without rewriting data.
