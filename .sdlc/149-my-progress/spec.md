# Spec: My progress (#149)

## Behaviour
- `memberWeeks(history, member, now, n=4, cap=500)` (utils.js): n local weeks (Monday start), oldest first, `{weekStart, points, count, partial}`. Bonus/deduction entries (`type:'bonus'`) count in points only. `partial` = history is at the cap and its oldest entry is later than the week start.
- "📈 My progress" pill in the filter row (shown when logged in) and a "Progress" button per member in the Admin Panel open `#progress-modal`: one row per week with a CSS bar (aria-hidden) and the values as text ("12 pts, 4 chores"), "(partial)" tag + capped note.

## UI states
- Member: own progress only. Admin: own and any member's (Admin Panel). `openProgress` refuses other members' data for non-admins. Readonly TV: no logged-in member, so no entry point.

## Data / cost
- No /state changes, no writes, no extra reads; uses `state.history` (capped at 500).

## Concerns
- Bars scale to the largest week in view (absolute value); negative weeks use a muted fill.
