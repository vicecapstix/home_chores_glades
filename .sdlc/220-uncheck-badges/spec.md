# Spec (#220)

## Behaviour
On check, `toggleTask` records the badge ids that completion awards on the task as `lastDoneBadges` (null when none),
in the same `patchTask` write as `lastDonePoints`. Every check overwrites it, so a value left from an earlier cycle is
never reused.

On uncheck (only when the points were actually reversed), the completer loses those badge ids whose `check` fails on
the member once this completion is undone (completedCount − 1, streak as restored), as JT chose (option B, 28 Oct). A
recorded badge still earned another way (e.g. a later chore keeps the count at 10) stays. The list is filtered from the
member's live `badges` just before the write, so badges added elsewhere meanwhile survive.
`lastDoneBadges` is cleared with the other `lastDone*` fields.

Badges earned earlier for other reasons are always kept, including an old threshold badge that the unticked chore
happened to re-reach (review finding on 28 Oct: an earlier "removed when check passed before and fails after" rule
dropped those).

## UI states
Admin/member: the badge disappears from the chip and leaderboard after the uncheck. Readonly TV: display only, no
writes (toggleTask already returns on READONLY).

## Data shape
New optional task field `lastDoneBadges: string[] | null` (documented in CLAUDE.md task data shape). Additive only:
no existing /state data is deleted, renamed or migrated. Tasks checked before this change have no `lastDoneBadges`,
so unticking them takes back no badges (same as today).
Writes `members/<name>/badges` (existing field) via `patchMember` only when a recorded badge is held.

## Security / RBAC
No new write path: runs inside `toggleTask`, after the existing READONLY and ownership checks. No HTML output.

## Cost guardrails
No extra writes on check (same task patch); at most one small member patch on uncheck. No new services or dependencies.
