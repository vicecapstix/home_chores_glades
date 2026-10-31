# Spec — #250 Restore keeps the newest 500 history entries

## Behaviour
- `validateBackup` (src/restore.js) caps history with `slice(-HISTORY_CAP)` instead of `slice(0, HISTORY_CAP)`. History is stored oldest-first and `appendHistory` keeps `slice(-cap)`, so restore now agrees.
- Backups with 500 or fewer entries are unchanged. Order stays oldest-first.

## UI states
Admin: restore preview/summary shows the capped count as before. Member and readonly TV: no UI change (restore is admin-only and already guarded).

## Data shape
No change to /state. Cap stays 500 (HISTORY_CAP).

## Security / RBAC
No new write path. Existing READONLY/isAdmin guards on restore untouched.

## Cost guardrails
No new services or dependencies; history stays bounded at 500.

## Flagged concerns
None. Not rules/auth/PIN/CI/deploy/dependency work.
