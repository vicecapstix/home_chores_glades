# Spec — #85 Member avatars

## Behaviour
- Fixed list `AVATARS` (16 emoji) in `src/utils.js`. Admin Panel member rows get a `<select>` ("Avatar for <name>") with a blank "none" option plus the list.
- `setAvatar(name, avatar, isAdminFn)` in `src/members.js`: `if (READONLY || !isAdminFn()) return;`, member must exist, `avatar` must be '' or in `AVATARS`; writes only `patchMember(name, { avatar })` (`''` stored as `null` = removed).
- `avatarPrefix(member)` (utils) returns `'<emoji> '` or `''` and only for values in `AVATARS`, so tampered DB values are never rendered. Shown before the name on the member chip, leaderboard rows and TV strip chips.

## UI states
Admin: picker in Admin Panel. Member: sees avatars. Readonly TV: sees avatars in the strip; no picker.

## Data shape (/state)
`members/<name>/avatar`: one emoji string from the fixed list, optional. `applySnapshot`/legacy migration unaffected. `writeState()` (whole-state) already serialises members as-is, so the field is preserved.

## Security / RBAC
Admin-only guard; allow-list validation on write and on render; no free text (no XSS vector); no PIN/auth/rules change.

## Cost guardrails
~4 bytes per member. Pass.

## Concerns
None.
