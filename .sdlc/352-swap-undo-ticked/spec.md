# Spec: swap undo after the taker ticked the chore (#352)

## Behaviour
`acceptSwap` records the chore's `lastDone` at the moment of the swap. The undo closure now throws "the chore has been done" (undo.js shows "Restore failed", the same convention as the skip undo, #309) and writes nothing, when the chore is done or its `lastDone` differs from that value. Otherwise it behaves as before (reassign to the offerer, remove the history swap note). The note is only removed in the branch that reassigns.

## UI states
- Member (taker): sees the toast instead of a silent no-op or a wrong reassignment.
- Admin: same as member (undo belongs to the person who accepted).
- Readonly TV: no undo toast exists there; `acceptSwap` returns early on READONLY (unchanged).

## Data shape
None. No /state change.

## Security / RBAC
No new write path. The undo only writes `tasks/<id>/person`, as before, and now writes less often.

## Cost guardrails
No new reads or writes; no dependencies; Spark plan unaffected.

## Concerns
Tick then untick restores `lastDone` and `done`, so undo then works again; that is correct (chore is back to how the swap left it).
