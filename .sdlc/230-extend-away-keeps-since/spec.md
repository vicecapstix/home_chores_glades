# Spec — #230 Extending a member's away date keeps the original start

## Behaviour
- `setAway(name, until)` in src/away.js: if the member already has `awaySince`, only `awayUntil` is patched; the original `awaySince` stays. If not away, `awaySince` is set to now as before.
- Toast stays "<name> is away until <date>" in both cases.
- `computeReturnPatch` is unchanged; with the preserved `awaySince` it now shifts `lastDone` and `lastStreakDate` by the full time away.

## UI states
Admin: Away mode form behaves the same. Member and readonly TV: chores/streak no longer come back overdue after an extended trip.

## Data shape
No change (`members/<name>/awayUntil`, `awaySince`).

## Security / RBAC
Existing `READONLY || !isAdminFn()` guard untouched; no new write path.

## Cost guardrails
No new services or dependencies; one fewer field written on extension.

## Flagged concerns
None.
