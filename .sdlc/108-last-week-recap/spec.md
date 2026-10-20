# Spec — #108 Last week's champion and weekly recap

## Behaviour
- `weekRecap(history, weekStart)` (utils.js): per-member points and completions for the local Mon 00:00 – next Mon 00:00 window, from `state.history`. Zero-activity members omitted; sorted by points, then name.
- `lastWeekChampion(history)`: previous local week's rows, top points, tied winners (shared), and `truncated` when history is at the 500 cap and its oldest entry is newer than that week's start.
- Leaderboard gets a "Last week" tab: rank, name (esc'd), pts, completions; ties share a rank; "Week of <date>" note; incomplete-data note when truncated; empty message when nothing was done.
- TV (`?readonly=1`): a small "🏆 Last week: A & B — N pts" chip appended to the weekly strip when there is a winner.

## UI states
Admin/member: new tab in the leaderboard modal. Read-only/TV: champion chip in the strip (display only, no controls).

## Data shape
None. No new fields in /state, no extra reads (history already loaded).

## Security / RBAC
Read-only rendering; no writes added. Names go through `esc()`.

## Cost guardrails
No new services, deps or data; no change to history cap (500).

## Flagged concerns
Because history is capped at 500, busy families may see partial totals for last week; surfaced with a note. Points reversed by unchecking are removed from history only if the app removes the entry (see open issue #32), so recap follows history.
