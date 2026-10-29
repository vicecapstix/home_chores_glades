# Spec — #225 Double-points day

## Behaviour
- Admin sets one date (`YYYY-MM-DD`, today or later) and a multiplier (2 or 3) in the Admin Panel; Clear removes it. Only one event exists (single key).
- On that local date, completing a chore awards `taskPoints(t) × mult`. The multiplied value is stored in `lastDonePoints` and the history entry, so uncheck reverses exactly what was awarded. Chores done before/after the date, or unchecked later on a different day, are unaffected.
- A banner "⭐ Double points today! ×2" shows on the event date (admin, member and the readonly TV). Pending cards show the multiplied "+N pts".
- After the date the event is ignored (no cleanup write needed); admin can still clear it.

## UI states
- Admin: form in Admin Panel (date + ×2/×3 + Set/Clear). Member: banner and multiplied points only. TV (`?readonly=1`): banner only, no handlers.

## Data shape
New optional node `state/doublePoints: { date, mult }` (two scalars). Nothing existing is reshaped; absent = off. Also carried in the offline cache snapshot.

## Security / RBAC
`setDoublePoints`/`clearDoublePoints`: `if (READONLY || !isAdminFn()) return false`. Inputs validated (real calendar date, mult ∈ {2,3}). Banner text set with `textContent`; admin form values through `esc()`. Database rules are open today (#95/#98): a crafted write could set the node, same as every other node; the multiplier is clamped to 2–3 on read.

## Cost guardrails
One tiny key; no history growth beyond the existing cap; no deps/services.

## Concerns
Points total is client-computed like all points today.
