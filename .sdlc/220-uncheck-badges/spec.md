# Spec (#220)

## Behaviour
On uncheck, after points/count are reversed and the streak is (maybe) restored, the completer loses any badge that the
completion being undone pushed them over: a badge is removed when its `check` passed on the member *before* the uncheck
and fails on the member *after* it (completedCount − 1, streak as restored). Badges whose check already failed before the
uncheck (e.g. a streak badge from an old streak) are kept, so badges earned earlier for other reasons survive.

Known edge: a member who held a streak badge from an earlier streak, lost the streak, and rebuilt it to exactly that
threshold with the chore being unticked would lose the badge too. Rare, and re-earned on the next tick; not worth a new
stored field.

## UI states
Admin/member: badge disappears from the chip and leaderboard after the uncheck. Readonly TV: display only, no writes
(toggleTask already returns on READONLY).

## Data shape
No new fields. Writes `members/<name>/badges` (existing field) via `patchMember` only when a badge is removed.

## Security / RBAC
No new write path: runs inside `toggleTask`, after the existing READONLY and ownership checks.

## Cost guardrails
One extra small patch on uncheck at most. No new services or dependencies.
