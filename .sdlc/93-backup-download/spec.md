# Spec — #93 Admin: download JSON backup

## Behaviour
- Admin Panel gets a "Download backup" button. `downloadBackup(isAdminFn)` (src/backup.js) builds a JSON snapshot from the already-loaded local `state` (no Firebase read or write) and saves it as `familyflow-backup-YYYY-MM-DD.json` (local date) via Blob + temporary anchor.
- File: `{ schemaVersion: 1, exportedAt (ISO), nextId, members, tasks, history, templates, rewards, redemptions }`. `pinHash` is removed from every member (deep copy; live state is not mutated).
- Download only. No restore/import.

## UI states
Admin: button in Admin Panel. Member: Admin Panel not reachable and the function refuses. Readonly TV: function refuses; panel not shown.

## Data shape
No change to /state. The backup file has its own `schemaVersion`.

## Security / RBAC
`if (READONLY || !isAdminFn()) return;` first line. PIN hashes never leave the app in the file.

## Cost guardrails
Zero Firebase reads/writes, no deps, no services. Free-tier safe.

## Concerns
Backup still contains names, points and history (family-private). Restore deliberately out of scope.
