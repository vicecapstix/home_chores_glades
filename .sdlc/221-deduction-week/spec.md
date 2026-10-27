# Spec (#221)

## Behaviour
`adjustBonus` (`src/bonus.js`) counts every ± Points adjustment toward the member's current week (`countWeek: true`),
not only positive ones. The existing transaction in `adjustMemberPoints` already clamps `weekPoints` at 0, so a big
deduction takes This week to 0, never negative. Undo reverses with the same options, so it adds the points back to the
week. "This week" (leaderboard, TV) and "Last week"/the TV champion (`weekRecap`, which already sums negative bonus
history) now agree for the same week.

## UI states
Admin: ± Points form unchanged. Member chips/leaderboard and readonly TV: This week drops after a deduction.

## Data shape
No new fields. Writes the existing `members/<name>/weekPoints` and `weekStart` in the existing transaction.

## Security / RBAC
No new write path; `adjustBonus` keeps `if (READONLY || !isAdminFn()) return false;`.

## Cost guardrails
No new services, dependencies or DB traffic.

## Flagged
`tests/bonus.test.js` › "deduction does not touch week points" asserted the old behaviour (`countWeek: false`); it is
updated to assert `countWeek: true` in the fix commit. The new #221 tests are not edited.
