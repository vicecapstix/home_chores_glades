# Spec: bonus undo checks the reversal result (#376)

## Behaviour
In the undo closure of `adjustBonus`, the result of `adjustMemberPoints` is checked. If it is not `ok` the closure throws ("the member no longer exists" for `missing`, otherwise "not connected - try again"); undo.js turns that into "Restore failed: ...". `removeHistoryEntry` runs only after a successful reversal. Success path unchanged.

## UI states
Admin: sees "Restore failed" instead of a false "Restored". Member and readonly TV: no ± Points UI, unchanged (`adjustBonus` returns early on READONLY / non-admin).

## Data shape
None.

## Security / RBAC
No new write path; the undo exists only after an admin-guarded award.

## Cost guardrails
No extra reads/writes, no dependencies.

## Concerns
After a thrown undo the admin can re-apply the opposite ± manually; the undo window is 5 s.
