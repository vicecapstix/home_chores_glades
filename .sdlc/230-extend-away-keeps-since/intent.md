## Problem
`setAway` in `src/away.js` always writes `awaySince: Date.now()`, even when the member is already away. If an admin extends a trip (e.g. away until Fri → changed to Sun on Thursday), the original start time is lost. On return, `computeReturnPatch` only shifts `lastStreakDate` and chores' `lastDone` by the time since the *extension*, so the member's chores come back overdue and their streak can break — the thing away mode (#176) is meant to prevent.

## Outcome / acceptance criteria
- [ ] Setting a new return date for a member who is already away keeps the existing `awaySince` and only changes `awayUntil`
- [ ] Setting away for a member who is not away still sets `awaySince` to now
- [ ] The toast says "away until <date>" in both cases
- [ ] After extend + return, chores' `lastDone` and `lastStreakDate` are shifted by the full time away

## Affected users
Admin (sets away), members (chores and streak), readonly TV (overdue cards and streak on chips).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features, no new services, API keys, secrets or paid hosting. Never write to or change rules on the live DB; tests mock Firebase.
- Data shape unchanged (`members/<name>/awayUntil`, `awaySince`).

## Open questions
None.

## Verification
Vitest in `tests/`: member with `awaySince = T0` and `awayUntil` set; call `setAway` with a later date → `patchMember` receives only `awayUntil` (no `awaySince`). Then `computeReturnPatch` at return shifts by `end − T0`. `npm test` and `npm run build` pass.

