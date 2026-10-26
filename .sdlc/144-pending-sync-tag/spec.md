# Spec #144 — pending-sync tag

## Behaviour
- Task writes (`patchTask`, `patchSubtask`) are wrapped by `trackWrite(taskId, op)` in `src/pending.js`. The RTDB SDK keeps a write promise pending until the server acks it, so an unresolved promise means "not synced".
- Card shows `⏳ not synced` (aria-label "Not synced yet") while any write for that task is unresolved; cleared on resolve.
- On rejection the tag becomes a button `⚠ not saved — tap to retry` (aria-label "Not saved. Tap to retry"). The error still propagates, so existing callers show their error toast. Tapping re-runs the identical write (`window.retrySync(id)`).
- Offline banner reads "N change(s) waiting — will sync when you reconnect" when offline and N > 0 (N = unresolved writes); otherwise the old text.

## UI states
- Admin / member: tags and banner as above.
- Readonly TV: write helpers return early under `READONLY`, so nothing is tracked and no tag appears.

## Data
- None. In-memory `Map` only; no `/state` change, no localStorage.

## RBAC
- No new writes. Retry re-issues a write the user was already allowed to make (same path/fields); rules still enforce server-side.

## Cost guardrails
- No extra reads/writes, no new services or deps. Spark-safe.

## Concerns
- Only task-scoped writes are tracked (member points transactions and history appends are not), per the issue wording "task write".
- A re-render fires on each pending-count change (2 per write); render is already invoked on every snapshot.
