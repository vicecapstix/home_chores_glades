# Spec #391 - away and pause overlap double-counted

## Behaviour
- While `state.pause` is set, `checkAwayExpiry` does nothing (expired away waits, like `checkOffExpiry`).
- When the pause ends (auto or Resume now), `computeResumePatch` also ends every member's already-expired away period in the same multi-path patch. The member's chores and streak date are shifted by the union of away and pause time: away time minus the overlap with the pause, plus the pause time.
- Away without pause and pause without away: unchanged (same code path, overlap 0).
- Example: away Mon 09:00 to Wed (ends Thu 00:00, 63 h), pause Tue 09:00 to Fri 00:00 (87 h): shift 111 h, not 150 h.

## States
- Admin: no UI change; Away/Pause controls as before.
- Member: their chores return with everyone else's, not ~1.6 days later.
- Readonly TV: no writes (READONLY guards kept); sees the result via snapshot.

## /state data shape
No change. Resume additionally nulls `members/<name>/awayUntil` and `awaySince` for expired aways (existing fields).

## RBAC
Unchanged. Same editing-client expiry model; no rules, auth or PIN change.

## Cost guardrails
No new services, deps or keys. One existing multi-path patch gets a few more paths. Spark plan only. Tests mock Firebase.

## Out of scope
An away still running after the pause ends keeps the existing full-duration shift at its return (no data is stored to track overlap with an earlier pause).
