# Spec — #309

## Behaviour
`skipTask` pushes an undo that restores the previous `lastDone`/`skippedAt`. The undo now re-reads live state (`state.tasks[id]`) first and only writes if the chore is still in the state the skip left it: not `done`, and `lastDone === skippedAt === <skip time>`. Otherwise it writes nothing and shows a toast ("Can't undo skip — chore changed"). Undo right after a skip is unchanged.

## UI states
- Admin: undo toast as today; if the guard trips, a toast replaces the restore.
- Member: cannot skip (existing `isAdminFn` guard), so no undo exists.
- Readonly TV: no writes (existing `READONLY` guard on `skipTask`).

## Data shape
None. Same `patchTask(id, {lastDone, skippedAt})` write as before, now conditional.

## Security / RBAC
`skipTask` keeps `if (READONLY || !isAdminFn()) return;`. Undo only exists after an admin skip. No new write path.

## Cost guardrails
No new reads, writes, services or dependencies. Check is against the in-memory live snapshot.

## Concerns
The check uses the local snapshot, so a tick on another device that has not yet synced could still be overwritten. The window is the sync latency (sub-second online); a transaction would need a firebase.js change and is out of scope for a daily item. Noted for JT.
