# Spec — #217 Keep approved-but-not-given rewards when the redemption log is full

## Behaviour
- `idsToDrop` only returns redemptions that are finished: `denied`, or `approved` with `givenAt` set. Oldest first (by `requestedAt`).
- `pending` and `approved` without `givenAt` are never dropped.
- If nothing can be dropped and the log is at the 100 cap, `requestReward` refuses before spending points, with a toast saying why. Cap stays 100 (`MAX_REDEMPTIONS`).

## UI states
- Member: new refusal toast ("Too many unfinished requests - ask a parent to give or clear some").
- Admin / readonly TV: no UI change; the To-give list keeps every entry.

## Data shape
No change to `/state/redemptions`. Fewer entries are dropped than before; the cap is unchanged.

## Security / RBAC
No new write path. `requestReward` already has `if (READONLY ...) return`.

## Cost guardrails
No new reads or storage; bounded at 100 entries. No services, rules or auth touched.

## Flagged concerns
Existing test "drops the oldest non-pending entries" used approved entries without `givenAt`, which encoded the bug; it is updated to use given entries.
