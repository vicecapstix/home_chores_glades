# Spec: saving goal (#141)

## Behaviour
- In Rewards, each reward row shows "Make this my goal" (member view). The current goal row shows "Clear goal" instead. One goal per member; choosing another replaces it.
- Stored as `members/<name>/goalRewardId` (string), written with a single-leaf `patchMember(name, {goalRewardId})`; clear writes `null` (key removed).
- Progress is derived live: `points = member.points`, `cost = rewards[goalRewardId].cost`, `pct = min(100, points/cost)`. If the reward no longer exists the goal is ignored (nothing shown); no stale copy of name/cost is stored.
- `points >= cost` shows "Ready to request!". Requesting still uses the existing request/approve flow (unchanged).

## UI states
- Member: Rewards modal buttons (own goal); member chip shows "🎯 <reward> 34/50" with a `role=progressbar` bar (aria-valuenow/min/max, aria-label).
- Admin: same, plus a "Goal for" select in Rewards to set/clear any member's goal.
- Readonly/TV: no buttons; TV strip chip shows goal text and bar.

## Data shape
`/state/members/<name>/goalRewardId?: string`. No new top-level keys. Draft rules allow unknown member children; rules unchanged.

## Security / RBAC
`setGoal`/`clearGoal`: `if (READONLY) return;`, then allowed only if target === currentMember() or isAdmin(). Names rendered via esc()/jsq().

## Cost guardrail check
One small string per member, one extra leaf write per click, no new reads, services, keys or deps. History cap untouched.

## Flagged concerns
- Firebase auth is shared/anonymous, so the ownership guard is client-side (consistent with the existing RBAC model).
- Goal is not auto-cleared on redemption; the bar shows progress against current points.
