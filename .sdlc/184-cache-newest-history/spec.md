# Spec #184 Cache newest history, not oldest

## Behaviour
`trimSnapshot()` keeps `history.slice(-HISTORY_LIMIT)` (newest 50, still oldest-first) instead of `slice(0, 50)`. `MAX_BYTES` logic untouched.

## UI states
Admin/member/TV on cached or offline starts show recent History, Last-week tab and the TV champion strip until the live snapshot arrives. No UI code change.

## Data / RBAC / cost
No /state change, no extra reads, no writes; localStorage only. History cap of 500 untouched. No RBAC impact.

## Concerns
Existing users' caches hold old entries until the next snapshot overwrites them (immediately on first online load).
