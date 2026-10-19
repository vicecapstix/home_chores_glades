# Spec - #88 local rollover timer

## Behaviour
- New `src/rollover.js`: `rolloverTick(render)` snapshots `id:done:dueStatus` per task, runs `checkTaskResets()`, re-snapshots and calls `render()` only if the signature changed (so inline edits, #34, are not wiped needlessly).
- `startRollover(render)` runs the tick every 60 s and on `visibilitychange` -> visible.
- Started from `main.js`; no new Firebase reads or listeners.

## UI states
- Admin / member: stale cards flip to not-done / overdue without a DB change; reset still persisted via existing `patchRoot` (idempotent multi-path update of the same leaves).
- Readonly TV: `checkTaskResets` already skips writes when READONLY; local state is mutated and the view re-rendered, so it rolls over with no writes.

## Data shape
None.

## Security / RBAC
No new writes. Reuses the existing reset write; READONLY guard unchanged.

## Cost guardrails
Client-side only, GitHub Pages + Spark; no new reads/listeners/deps. At most one small patchRoot per real reset.

## Concerns
Several devices may write the same reset at once; it sets identical values so is harmless.
