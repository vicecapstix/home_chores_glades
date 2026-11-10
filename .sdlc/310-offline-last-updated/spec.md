# Spec — #310

## Behaviour
`src/connection.js` remembers the last `.info/connected` value (null until Firebase reports) and exports `isDisconnected()` (true only when the last value was `false`). `markSynced()` does nothing while disconnected. In `src/main.js` the `/state` handler calls `saveSnapshot(state)` only when `!isDisconnected()`. Result: local-write echoes while offline do not move "Last updated", the TV "Last synced" text, or the cache `savedAt`. On reconnect the next server snapshot updates them as today. Before Firebase has reported connectivity (cold start) nothing is blocked.

## UI states
- Admin / member: banner text unchanged; time stays at the last server snapshot while offline.
- Readonly TV: "Last synced" no longer advances on local events (the TV has none) — same behaviour online.

## Data shape
None. No database writes. The localStorage cache simply is not re-saved while offline (it keeps the last server copy and its `savedAt`).

## Security / RBAC
No new write path, no auth/PIN/rules change.

## Cost guardrails
Display/cache only. No new reads, services or dependencies.

## Concerns
A chore ticked offline is not added to the local cache until the next server snapshot; an offline cached restart would not show it (it shows the last server copy, as the banner says). Accepted: it matches "data from the server".
