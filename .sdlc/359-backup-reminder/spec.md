# Spec: backup reminder for parents (#359)

## Behaviour
- `src/backupreminder.js` (new, display only). A successful `downloadBackup` stores `ff_backup_last` (ms) in localStorage (try/catch, in-memory fallback) and hides the banner. This includes the safety backup restore downloads.
- `renderBackupReminder(isAdminFn)` runs from `render()`. It shows `#backup-reminder` when the device never downloaded a backup or the last one is 30+ days old, unless snoozed. Text: "Last backup: N days ago." or "No backup downloaded on this device yet."
- "Later" stores `ff_backup_snooze` = now + 7 days and hides it. "Download" calls the existing `window.downloadBackup`.
- Not shown when there are no chores yet (nothing to back up).

## UI states
- Admin (or setup mode with chores): banner with Download and Later.
- Member: hidden (JS `isAdmin` check plus `body[data-role="member"]` CSS).
- Readonly TV (`?readonly=1`): hidden (JS READONLY check plus `body[data-readonly]` CSS); dismiss is a no-op.
- Banner text is set with `textContent`; the only interpolated value is a number.

## Data shape
No /state change. Two device-local keys. Restore does not touch them and cannot strip them (they are not in the backup file); no follow-up needed for src/restore.js or member rename.

## Security / RBAC
No Firebase access, no new write path, no PIN data. `dismissBackupReminder` returns on READONLY.

## Cost guardrails
Nothing stored or downloaded beyond two small localStorage keys; no new services or dependencies.

## Concerns
Per-device only: a second parent's phone has its own date, by design (issue constraint).
