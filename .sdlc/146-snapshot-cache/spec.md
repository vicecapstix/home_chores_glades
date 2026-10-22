# Spec — #146 snapshot cache

## Behaviour
- After every live snapshot, a trimmed copy is saved to `localStorage["familyflow-snapshot-v1"]`: members (pinHash removed), tasks, rewards, pause, nextId, history sliced to 50. Not stored: redemptions, /private, session/login data.
- Write is skipped (old copy kept) if JSON > 200 KB; all storage access is in try/catch.
- On start, if a cache exists: state is loaded from it, `render()` runs, and a "Showing saved data — connecting…" banner shows. Write helpers in `firebase.js` return early until the first live snapshot (`setWritesEnabled`). Login flow (`handleFirstLoad`) is deferred to the live snapshot as before.
- First live snapshot: writes enabled, banner hidden, cache refreshed, normal render path (inline-edit preservation of #34 is in `render()` and unchanged).
- Logout does not touch the cache. Admin Panel has "Clear saved data on this device".

## UI states
- Admin/member: banner above content while cached; actions no-op until live.
- Readonly TV: banner shown the same way; no controls; main use case.

## Data shape
No change to /state. New device-local key only.

## Security / RBAC
pinHash never persisted. Clear button is local-only (no DB write), so no admin gate is required, but it sits in the admin panel. Write guards extended with `!_live`.

## Cost guardrails
No extra reads, no new service/dependency, no rules changes. History cap 500 untouched.

## Flagged concerns
- Cached member names/points sit in plain localStorage on shared devices (no PINs). Clear button mitigates.
- "Settings" does not exist in the UI; button placed in the Admin Panel (admin-only), so non-admin phones can clear via browser site data.
