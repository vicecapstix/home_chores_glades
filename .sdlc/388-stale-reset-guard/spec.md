# Spec: stale offline device must not reset a newer completion (#388)

## Behaviour
- `checkTaskResets()` writes nothing (and leaves its local copy alone) while `isDisconnected()`.
- Online, each due reset goes through `resetTasks(patch, seen)` in firebase.js: one transaction per task on `state/tasks/<id>` that applies the reset only if the server still has `done === true` and `lastDone` equal to what this device saw. A newer completion, or a reset another device already did, is left untouched.
- The reset fields are unchanged: done=false, lastDoneBy/lastDonePoints=null, done subtasks cleared, rotation advance.

## UI states
Admin/member/readonly: no visible change. READONLY writes nothing (guard kept).

## Data shape
None. Same leaves written as before; only the write mechanism becomes conditional.

## Security / RBAC
No rules change. `resetTasks` is READONLY / `_live` guarded like other write helpers. Not an admin action (resets are automatic), unchanged from before.

## Cost guardrails
One tiny transaction per task that is actually due (typically a handful at day rollover). No new services or deps; Spark plan fine.

## Concerns
Transactions need a server round trip; if it fails the toast shows "Save error" and the next 60 s tick retries (local copy is not reverted, as before).
