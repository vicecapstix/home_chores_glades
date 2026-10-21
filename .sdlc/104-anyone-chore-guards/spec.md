# Spec — #104 Guards for 'Anyone' chores, subtasks and edit

## Behaviour
- Non-admin `toggleTask`: blocked on chores assigned to someone else (unchanged); NEW: a done 'Anyone' chore can be unchecked only by the member in `lastDoneBy` (or when `lastDoneBy` is empty). Toast explains. No points move when blocked.
- `toggleSubtask(taskId, subId, currentMemberFn, isAdminFn)` applies the same rule; missing fns = denied.
- `editTask(id, isAdminFn)` returns early unless `!READONLY && isAdminFn()`.
## UI states
Admin: unchanged. Member: sees a toast instead of the action when blocked. Read-only TV: no writes (unchanged).
## Data shape
None.
## Security / RBAC
Client-side only (server enforcement is epic #95). Guards added to 2 write paths and the edit entry point; `main.js` passes `_isAdmin` / `_currentMember`.
## Cost guardrails
No services, deps or extra writes.
## Flagged concerns
Signature change: `editTask` and `toggleSubtask` now need the admin/member fns; existing tests updated to pass them.
