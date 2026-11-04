# Spec — #258 Offline banner shows when the data on screen was last updated

## Behaviour
- `connection.js` keeps `lastUpdated` (ms) in memory. `markSynced` (called on every live snapshot) sets it to now. On a cached start `main.js` sets it to the cache's existing `savedAt` (from #146) until the first live snapshot.
- `formatUpdated(ms, now)`: same day `14:05`; previous day `yesterday 21:10`; older `Mon, 4 May 21:10`.
- Offline banner gets ` · Last updated 14:05` appended (also in the "N changes waiting" form). The sync dot tooltip reads `Offline · last updated 14:05`.
- Cache banner reads `Showing saved data from 14:05 — connecting…` (falls back to the old text when there is no `savedAt`).
- Nothing is shown while online, and nothing is shown when the time is unknown.

## UI states
- Admin / member: offline banner and dot tooltip carry the time.
- Readonly TV: banner (visible without hover) carries the time; existing "Last synced" line unchanged.

## Data shape
None. No new storage key; `savedAt` already exists in the cache. Display only.

## Security / RBAC
No write path. Text set with `textContent` (no HTML injection). No user data involved.

## Cost guardrails
No DB reads or writes. No services, rules or auth touched.

## Flagged concerns
Time uses the device locale/timezone, like the existing `formatTime`.
