# Spec #32
Already fixed on main (not touched): points reversal on uncheck, completedCount decrement (via adjustMemberPoints count -1), ownership guards.
Remaining (this PR): lastDone, history entry, streak/lastStreakDate on uncheck.

Behaviour
- Check stores `prevLastDone` (and `prevStreak` / `prevStreakDate` of the awardee) on the task; history `completedAt` now equals the task's new `lastDone`.
- Uncheck restores `lastDone = prevLastDone` (legacy tasks without it keep lastDone), removes the history entry matching taskId + completedAt (+ person), and restores the member streak only if no other completion by that member remains the same day and the streak was actually advanced by this completion. The prev* fields are then cleared (null).
- Badges are not revoked (out of scope; badge thresholds are monotonic and re-checked on next completion).

UI: no new UI; status sections / Stats / CSV on admin, member and TV reflect the restored values.
Data shape: task gains optional `prevLastDone`, `prevStreak`, `prevStreakDate` (small, per task, cleared on uncheck).
Security/RBAC: toggleTask keeps READONLY guard and ownershipBlock (member own chores, Anyone chores only by completer, admin all); points arithmetic untouched.
Cost: uncheck adds at most one history patch and one member patch; history stays capped at 500 (only shrinks).
Concerns: history rows written before this change have no matching completedAt, so uncheck of an already-checked legacy task leaves its history entry; failures to patch history/member toast and do not roll back the uncheck.
