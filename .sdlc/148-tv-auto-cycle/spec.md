# Spec: TV auto-cycle (#148)

## Behaviour
- `?readonly=1&cycle=1` (`TV_CYCLE` in config.js) starts `createTvCycle` (tv.js). Panels rotate every 30 s: Chores (the normal view) -> Leaderboard (this week + last week via `leaderboardHTML`, extracted from ui.js) -> Rewards catalog (`rewardsHTML(rewards, false)`, no buttons) -> Chores.
- Any key press pauses rotation for 2 minutes; ArrowRight/ArrowLeft move to the next/previous panel (wrapping) and also pause. The current panel is re-rendered on each Firebase snapshot (`refreshTvCycle`) so data stays live.
- Non-chore panels render into `#tv-panel` and hide `#main-content` via `body.tv-panel-on`; slide-in animation is dropped under `prefers-reduced-motion: reduce`.

## UI states
- Admin/member views and plain `?readonly=1` TV: unchanged. Only readonly + cycle=1 activates it.

## Data / RBAC / cost
- No /state changes, no writes, no extra reads: panels reuse already-synced `state`. `tv.js` imports no Firebase module. Spark-plan safe.

## Concerns
- Resume after a key pause happens at the next 30 s tick (up to 30 s late).
- Week planner (#143) is not a cycle panel yet; it is a natural follow-up.
