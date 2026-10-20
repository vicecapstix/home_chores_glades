# Plan — #93
## Files
- src/backup.js (new): `buildBackup`, `backupFilename`, `downloadBackup`
- src/main.js: import + `window.downloadBackup`; src/index.html: button in Admin Panel
- tests/backup.test.js, tests/backup-readonly.test.js (new)
## Steps
1. builder + download; 2. wire handler and button; 3. tests; 4. build:pages.
## Test plan
Shape, pinHash stripped and state not mutated, filename, admin / non-admin / READONLY guards.
## Rollback
Revert the PR; no data changes.
