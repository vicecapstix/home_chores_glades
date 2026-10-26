# Spec: Family team goal (#174)

## Behaviour
- Admin Panel gets a "Family weekly goal" form: points (10-2000, integer) and reward (1-40 chars). Set writes `state/teamGoal = {points, reward}`; Clear writes `null`.
- Progress = sum of `points` of history entries whose `completedAt` is in the current local Mon 00:00 to next Mon 00:00 week (same `weekRecap` logic). No counters stored.
- Goal bar (`#team-goal`, `role=progressbar`, aria-valuenow/max, label) shows "🍕 Reward: 140 / 200". Hidden when no goal. Value is clamped at the target for ARIA; bar fill caps at 100%.
- Celebration (toast + confetti class) once per week per device, tracked in localStorage (`ff_teamgoal_week` = week Monday).

## UI states
- Admin: bar + form in Admin Panel (inputs prefilled with the current goal, Clear button when set).
- Member: bar only.
- Readonly TV: bar only, larger text/track at >=1200px.

## Data
- One new top-level key `state/teamGoal` (tiny). No rules change (allowed by the draft rules). Not added to the offline cache (cache keeps only 50 history entries, progress would be wrong).

## RBAC
- `setTeamGoal` / `clearTeamGoal` start with `READONLY || !isAdminFn()`. Reward text is rendered with `textContent` and `esc()` in the form.

## Cost guardrail check
- One small patch per admin action; no extra reads (history already in snapshot, cap 500 unchanged). Spark plan, no new services.

## Concerns
- History is capped at 500 so a very busy week could undercount (same limitation as the weekly recap).
- Bonus/deduction history entries count toward progress (they are points in history).
