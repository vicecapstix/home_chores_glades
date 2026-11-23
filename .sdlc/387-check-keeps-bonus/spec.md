# Spec: parent check keeps the bonus and multiplier from tick time (#387)

## Behaviour
- When a member ticks a needs-check chore, `checkPending` stores `{by, at, bonus, mult}`: the bonus-chore extra (0 if none) and double-points multiplier (1 if none) in force at the tick.
- On approval, `applyToggle` uses the stored `bonus`/`mult` when present; otherwise (legacy requests) it falls back to computing from live state at tick time, as today.
- Uncheck is unchanged: it reverses exactly `lastDonePoints`.
- The admin "To check" list shows the same points the child will get (uses stored mult when present).

## UI states
- Admin: sees the correct "+N pts" in To check; approval awards that.
- Member: ticks as before; no new UI.
- Readonly/TV: no write path; unchanged.

## Data shape
`state/tasks/<id>/checkPending` gains optional `bonus` (int 0-20) and `mult` (2|3 or 1). Additive, optional, short-lived (cleared on approval/send-back). No migration.

## Security / RBAC
No new write path. Values are computed client-side from state, same trust level as `lastDonePoints`. `approveCheck` stays admin-only and READONLY-guarded. Stored values are re-validated on read (integer 0-20, mult in 1/2/3) so a crafted value cannot inflate points.

## Cost guardrails
Two small ints on an existing short-lived node. No new services, deps, rules.

## Concerns
None.
