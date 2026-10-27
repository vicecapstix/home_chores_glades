# Spec — #215 Editing an "Every N days" chore never saves N

## Behaviour
`saveTask` (src/tasks.js) builds a multi-path update. It must include `tasks/<id>/intervalDays`:
- freq `interval` → the validated N (2–60)
- any other freq → `null` (removes a stale value on the server)

## UI states
- Admin: edit form unchanged; Save now persists N.
- Member / readonly TV: no UI change; they receive the correct N via the normal snapshot, so due status, label and points are right.

## Data shape (/state)
`tasks/<id>/intervalDays`: number 2–60 or absent. No new fields, no new nodes.

## Security / RBAC
`saveTask` keeps its `if (READONLY || !isAdminFn()) return;` guard. No new write path.

## Cost guardrails
One extra key in an existing multi-path update. No new services, reads or rules. Pages + Spark unchanged.

## Concerns
None. (Pre-existing: switching weekly→every-N keeps the old `lastDone`; out of scope.)
