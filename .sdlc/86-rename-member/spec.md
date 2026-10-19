# Spec — #86 Rename member
## Behaviour
Admin Panel member rows get a "Rename" button (prompt for new name). `renameMember(old, new, isAdminFn)` in `src/members.js` trims, rejects empty/same/unknown, duplicates ("already taken") and invalid names (`validateMemberName`, same as addMember), then calls `patchPaths(renamePaths(...))` - ONE `update()` on `/state` that: nulls `members/old`, writes `members/new` as a copy with `name` changed (pinHash, points, avatar, badges, streak untouched), and rewrites `person`/`lastDoneBy` on tasks, `person` on history entries (array index paths, so size stays <=500), and `member`/`decidedBy` on redemptions. If the renamer is the logged-in member the session name is updated.
## UI states
Admin: Rename button in admin panel. Member: not available. Readonly TV: not available; sees new name via live listener.
## Data shape
No schema change; only values of existing name-referencing fields move.
## Security / RBAC
`if (READONLY || !isAdminFn()) return`; window handler also guards; PIN hashes copied verbatim, no rules/auth change. Names validated against Firebase key chars.
## Cost guardrails
One write of the member record + a few small string paths; no new nodes. Pass.
## Concerns
Other devices logged in as the old name keep a stale session name until re-login (member no longer exists, so they are prompted to pick again). Offline concurrent edits during rename could leave an old-name reference; acceptable for a household app.
