# Spec — #89

## Behaviour
- `removeMember(name, isAdminFn, currentMemberFn, onSelfRemoved)`: if target is the only admin and other members remain, toast "Cannot remove the last admin" and stop (before the confirm prompt). Removing the sole remaining member (any role) is still allowed.
- Pending redemptions of the removed member are deleted from `state.redemptions` and persisted in the same `writeState()` (no refund; member is gone). Approved/denied entries are kept.
- If the removed member is the logged-in one, `onSelfRemoved` (switchUser) runs after a successful write.
- Refund callers (request-failure rollback, request undo) skip when the member no longer exists, so no half-member node `members/<name>/points` is created. Deny already had this guard.

## UI states
Admin: toast on refusal; self-removal returns to the member picker. Member / read-only TV: no change (remove is admin-only, guarded by `READONLY || !isAdminFn()`).

## Data shape
No change. `/state/redemptions` entries for the removed member are dropped.

## Security / RBAC
Client-side guard only (server enforcement is #41). No PIN code touched.

## Cost guardrails
No new services/deps; one existing full-state write.

## Concerns
A refund racing from another device can still recreate a node; out of scope (needs #41 rules).
