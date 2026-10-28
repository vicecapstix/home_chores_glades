# Spec (#221)

## Behaviour
`adjustBonus` (`src/bonus.js`) counts every ± Points adjustment toward the member's current week (`countWeek: true`),
not only positive ones. The existing transaction in `adjustMemberPoints` already clamps `weekPoints` at 0, so a big
deduction takes This week to 0, never negative. `adjustMemberPoints` now also returns `weekDelta` (how much
`weekPoints` actually moved after the floor) and accepts an optional `weekPts`; undo reverses the total by `amount` but
the week only by `weekDelta`, so −5 on 3 week points then Undo gives 3, not 5 (review round, 28 Oct).

Trade-off (review note): after a deduction larger than the week's points, This week floors at 0 while the history recap
keeps the negative remainder, so the two can differ for the rest of that week (3, −5 → 0, then a 4-pt chore → This
week 4, recap 2). Accepted: a negative weekly score on the TV would be worse, and the recap already hides members at
or below 0. "This week" (leaderboard, TV) and "Last week"/the TV champion (`weekRecap`, which already sums negative bonus
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
