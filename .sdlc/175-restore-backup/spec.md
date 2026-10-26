# Spec: Restore from JSON backup (#175)

## Behaviour
- Admin Panel > "Restore backup…" opens a file picker (`.json`). The file is read on the device (`File.text()`), never uploaded.
- `validateBackup` checks `schemaVersion === 1`, shape, then sanitises: member names via `validateMemberName`, chores need a safe id, name (<=60) and known `freq`, rewards via `validateReward`, redemptions need id/member/status. Invalid items are skipped and counted.
- A summary modal shows members, chores, history count, exported date and skipped count. The Restore button stays disabled until `RESTORE` is typed exactly.
- On confirm: a fresh backup of the current data downloads first (abort if that fails), then ONE `patchRoot` writes members, tasks, history, templates, rewards, redemptions and `nextId`.
- Caps on import: history 500, redemptions 100 (newest kept), rewards 50, templates 20 with 100 tasks each.
- PINs: the file's `pinHash` is never read; a member present now keeps their current `pinHash`; new members get `''`.
- `nextId = max(file, current)` so ids already handed out are not reused.
- Backup must contain at least one admin member (avoids locking everyone out).

## UI states
- Admin: button + modal. Member: no admin panel. Readonly TV: no controls; functions return early on `READONLY`.

## Data
- No new keys. `pause` and `teamGoal` are not touched (the update only writes the listed keys). Existing members absent from the file are removed (restore = replace).

## RBAC
- `prepareRestore` and `confirmRestore` start with `READONLY || !isAdminFn()`.

## Cost guardrails
- One write of at most the capped dataset, only when an admin confirms. No reads, no services.

## Concerns
- `downloadBackup` now returns a boolean; MAX_TEMPLATES/MAX_TEMPLATE_TASKS exported from `ui.js` to share caps.
- Unknown extra fields on chores/members are passed through (so future fields survive a restore), but PINs never.
- Rules emulator tests were not added or run.
