# Intent — #93

# Admin: download a JSON backup of family data (PIN hashes excluded)

## Problem
All family data lives in one Firebase node with open rules (#41). There is no way to keep a copy: an accidental bulk delete, a bad template apply, or a stray write would lose points, history and chores for good.

## Outcome / acceptance criteria
- Admin Panel -> "Download backup" saves `familyflow-backup-YYYY-MM-DD.json` built from the already-loaded local `state` (no extra Firebase read)
- File includes members, tasks, history, templates, rewards, redemptions, nextId, plus `exportedAt` and an app `schemaVersion`
- `pinHash` values are omitted from the file
- Admin-only and hidden on TV (`READONLY || !isAdminFn()`)
- Tests: shape, pinHash stripped, admin guard

## Constraints
Free tier only (GitHub Pages + Spark RTDB), no new deps/services. Download only, no restore/import. Run `npm run build:pages` and commit root files.

(Full text: issue #93.)
