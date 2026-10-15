# Spec — #29 Granular patches for resets, claim and subtasks

## Behaviour
- `checkTaskResets`: for each recurring task that is done and due (including `weekdays`), collect `tasks/<id>/done=false`, `tasks/<id>/lastDoneBy=null`, `tasks/<id>/lastDonePoints=null` and send ONE multi-path `update()` via `patchRoot`. No full `set()` of `/state`.
- `claimTask`: `patchTask(id, { person })`.
- `addSubtask`: `patchSubtask(taskId, subId, { id, name, done:false })`.
- `removeSubtask`: `patchRoot({ 'tasks/<taskId>/subtasks/<subId>': null })`.
- Nothing changes when no task needs a reset (no write at all).

## UI states
- Admin / member: unchanged visually; the result is identical, only the write shape is smaller.
- Readonly TV (`?readonly=1`): firebase helpers already no-op under READONLY; the functions also return early. Covered by a test.

## Data shape (/state)
No change. Same fields written, but at leaf paths, so a concurrent edit on another device (e.g. a rename) is no longer overwritten by a stale full-state write.

## Security / RBAC
Guards unchanged: `addSubtask`/`removeSubtask` stay admin-only; `claimTask` keeps its READONLY + member checks. No new write paths.

## Cost guardrails
Smaller writes (less upload bandwidth), no new service, no rules/auth/DB URL change, history cap untouched. Tests use mocks only.

## Flagged concerns
`checkTaskResets` runs on every client for every snapshot; two clients may write the same reset concurrently, which is idempotent (same leaf values).
