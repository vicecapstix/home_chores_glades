# Spec: Reward limits per week (#181)

## Behaviour
- Rewards form gets an optional "Max/wk" input (integer 1-14). Blank = unlimited. Stored as `rewards/<id>/perWeek`; clearing it on edit removes the field (the reward object is replaced).
- `usedThisWeek(redemptions, rewardId, member)` counts that member's `pending` + `approved` requests for the reward whose `requestedAt` is in the current local Mon 00:00 to next Mon 00:00 week. Denied requests are ignored; a new week resets naturally.
- Request button shows "2/2 this week" and is disabled at the limit; below the limit a "1/2 this week" note sits next to the cost. `requestReward` re-checks and blocks with a toast before any points are spent.
- Rewards without `perWeek` behave as before.

## UI states
- Admin: sees the field in the form and the note on each limited reward. Member: note + button text. Readonly TV: rewards modal is not part of it; plain "N per week" text if ever rendered without a member.

## Data
- One optional number per reward. No rules change.

## RBAC
- Saving still goes through `saveReward` (`READONLY || !isAdminFn()`); enforcement is client-side for members.

## Cost guardrail check
- No new reads or writes; counts come from the snapshot's redemptions (cap 100 unchanged).

## Concerns
- Soft limit: enforced in the client only, and two devices requesting at the same moment could both pass. Redemption pruning (cap 100) can drop old approved entries, but those are typically older than the current week.
