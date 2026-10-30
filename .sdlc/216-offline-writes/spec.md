# Spec — #216 Changes made while the cached copy is showing are silently dropped

## Behaviour
While `_live` is false (cached start, until the first live snapshot) every write helper in `firebase.js` returns silently. Entry points then toast misleading text or success. New behaviour:
- New tiny module `src/writegate.js` owns the flag (`isLive`, `setLive`, `CONNECTING_MSG`). `firebase.js` `setWritesEnabled` sets it; the helpers read it. Separate module so the ~60 tests that mock `firebase.js` keep working.
- Write entry points check the gate first and show one toast, "Still connecting — try again in a moment", changing nothing locally: toggle chore, add/save chore, request reward, approve/deny reward, save/apply template, set/clear family goal.
- `adjustMemberPoints` returns `{ ok:false, reason:'offline' }` (not `'readonly'`) when not live; callers treat it with the same message. `spendPoints`/`decideRedemption` still return `false` (callers are guarded at entry; changing the return type would make a truthy value unsafe).
- The cache banner reads "Showing saved data — changes can't be saved until it reconnects" so it no longer implies sync.
- The "Offline — changes will sync when you reconnect" banner is unchanged: with a live session the Firebase SDK does queue writes.

## UI states
Admin/member: toast on write attempt while cached. Readonly TV: unchanged (never writes).

## Data shape
None.

## Security / RBAC
Gate is an extra early return after existing READONLY/admin guards; no guard removed.

## Cost guardrails
No new reads/writes/services. Local-only change. No queueing of writes in localStorage (out of scope per issue).

## Concerns
`spendPoints`/`decideRedemption` keep boolean returns (see above); the issue's "distinct reason" is met for `adjustMemberPoints` and by entry-point guards.
