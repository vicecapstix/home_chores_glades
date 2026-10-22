# Spec: atomic history append (#31)

## Behaviour
- Completing a chore appends one entry to `state/history` via `runTransaction` on that path (`appendHistory` in `src/firebase.js`). The updater runs against the live server array, appends, and keeps the newest 500 (cap unchanged).
- Concurrent completions from two devices can no longer overwrite each other's entries (the transaction retries on the latest value).
- Uncheck removal of an entry is unchanged (still a patch); out of scope here.

## UI states
- Admin / member: no visible change. Toast "History update failed" on error as before.
- Read-only TV: `appendHistory` returns early under READONLY; no writes.

## Data shape
None. `/state/history` stays an array of `{taskId, taskName, person, completedAt, points}`, max 500. Object-shaped server data is tolerated.

## Security / RBAC
Called only from `toggleTask`, which already has READONLY and permission guards; helper also guards READONLY. No rules changes.

## Cost guardrails
No new services/deps. Cap stays 500. Note: while the array is full, each append still rewrites the array (index shift), so download per completion is unchanged; the fix here is correctness (no lost entries). A keyed-push history would cut bandwidth but changes data shape and is a follow-up.

## Flagged concerns
Bandwidth part of the issue is only partly addressed (see above).
