# Spec — #249 Rollover tick ends expired house pause and away periods

## Behaviour
- The local rollover tick (`src/rollover.js`, every 60 s and on tab-visible) calls `checkPauseExpiry()` and `checkAwayExpiry()` before `checkTaskResets()`, the same order `main.js` uses on a snapshot.
- A screen left open past the pause end therefore ends the pause (one multi-path `patchRoot`, shifting `lastDone` and streak dates), after which the next tick resets done daily chores. Same for a member's `awayUntil` (`patchPaths`).
- The expiry functions are idempotent: they already guard on `state.pause` / `awayUntil` and an in-flight flag, and the writes are the same multi-path values from every device, so several open screens give one result.

## UI states
- Admin / member phone or tablet: pause banner clears and chores reset without a reload.
- Readonly TV: `checkPauseExpiry` / `checkAwayExpiry` return at `READONLY`, so no writes; the TV keeps its current behaviour and updates when an editing client ends the pause and the snapshot arrives.

## Data shape
No change. Same patches as the existing snapshot path.

## Security / RBAC
No new write path: the existing functions already refuse in READONLY. No admin check, as for the snapshot path (any editing client ends an expired pause).

## Cost guardrails
No new reads or listeners; at most one write per expiry. No services, rules or auth touched.

## Flagged concerns
Expiry runs `resume()` async, so the chores reset on the tick after the pause clears (up to 60 s later), as on a snapshot.
