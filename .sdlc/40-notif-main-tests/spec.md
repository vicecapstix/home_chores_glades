# Spec: notification dedupe + main.js bootstrap tests (#40)

## Scope in this PR
- `tests/notifications-daily.test.js`: drives the real `initNotifications` → first check + 30-minute `setInterval` with fake timers. Proves each overdue chore is notified once per day across the 30-minute checks, a chore that becomes overdue later is notified once at the next check, the `fc_last_notify_date` flag resets at local midnight (chores notify again, once), and other members' chores are never notified.
- `tests/main-bootstrap.test.js`: really imports and runs `src/main.js` against the real `src/index.html` body, with the Firebase SDK (`onValue`/`ref`) and `initFirebase`/`initAuth` mocked. Proves: auth is awaited before the `/state` listener; each live snapshot runs `applySnapshot → setWritesEnabled(true) → cache banner off → saveSnapshot → checkTaskResets → render → markSynced`, then `handleFirstLoad` once; a cached snapshot renders read-only before auth; `?readonly=1` hides the PIN screen, sets `data-readonly`/`data-role`, shows the banner and never runs the login flow.
- Mutation-checked locally: swapping `render`/`checkTaskResets`, disabling the READONLY block, removing `_notifiedIds.add` or the date reset each makes these tests fail.

## Out of scope (needs JT)
- Coverage report (`vitest --coverage`) needs a new dev dependency (`@vitest/coverage-v8`). The cleanup run must not add dependencies, so that item stays open on #40 for JT to decide.

## Behaviour / data / RBAC / security
No `src/` changes. No `/state` access; Firebase fully mocked; no network.

## Cost guardrails
Tests only; no services, runners or dependencies change.
