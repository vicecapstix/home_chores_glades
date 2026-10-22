# Spec: #30 multipath update

## Behaviour
User-visible behaviour is unchanged. Six admin write paths stop rewriting all of `/state` and send one `update()` of only the keys they change (atomic, one round trip):
- addTask: `tasks/<id>`, `nextId`
- saveTask: `tasks/<id>/{name,freq,days,dueDate,dueTime,difficulty,category,person,notes,rotation,lastDone}` (removed fields = null)
- addMember: `members/<name>`
- removeMember: `members/<name>`=null, `tasks/<id>/person`='' and `tasks/<id>/rotation` for affected tasks, `redemptions/<id>`=null for their pending requests
- bulkAssign: `tasks/<id>/person` per selected task
- applyTemplate: `tasks/<id>` per new task, `nextId`

`writeState()` remains exported (tested, no remaining callers).

## UI states
Admin: unchanged. Member: controls still hidden/guarded. Readonly TV: `READONLY` guards unchanged and `patchPaths` itself no-ops when READONLY.

## Data shape
No change to /state.

## Security / RBAC
Every function keeps its READONLY/admin guard. Rules unchanged. Benefit: edits no longer clobber concurrent writes (points, history) from other devices.

## Cost guardrails
Spark plan, no new service. Writes shrink (the up-to-500-entry history is no longer rewritten on each edit).

## Flagged concerns
A partial write to `tasks/<id>/x` for a task deleted elsewhere would recreate a stub; saveTask only runs when the card exists in local state, so risk is a narrow race.
