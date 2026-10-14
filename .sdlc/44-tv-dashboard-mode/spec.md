# Spec — #44 TV dashboard mode for ?readonly=1

## Behaviour
`?readonly=1` already sets `body[data-readonly]`. New `src/tv.js` adds:
- `body.tv` class in readonly; large clock + date (`#tv-clock`) updated every 15 s; leaderboard strip (`#tv-strip`, this week's points, from existing `state.members`, no new reads).
- At >=1200px in readonly: `#task-list` becomes a 3-column grid — Overdue | Due soon | Done today (fixed columns, `.section[data-k]`); Available/Upcoming sections span full width below. Clock and strip are shown only at >=1200px.
- Admin controls hidden in readonly at all widths (add bar, add-member, Select/Admin/Switch-user buttons, bulk bar, filters).
- Readonly banner is `position: static` in readonly so it no longer overlaps the header.
- Screen Wake Lock requested when `navigator.wakeLock` exists (re-acquired on `visibilitychange`); silent no-op otherwise, errors swallowed.

## UI states
- Readonly TV (>=1200px): above. Readonly phone/tablet: single column as today, admin controls hidden, banner in flow.
- Admin / member (not readonly): unchanged. `tv.js` does nothing unless READONLY.

## Data shape
None. No change to /state; no writes; no new reads.

## Security / RBAC
Read-only DOM work; no write paths added. Member names escaped via esc(). Wake lock needs no permission prompt.

## Cost guardrail check
Pure CSS/JS, no services/deps. Timer is local only (no Firebase traffic).

## Flagged concerns
- Per #44 deploy note, root `index.html` is NOT regenerated (drift epic #20: #22 pending). Merging this PR does not change the live TV until the root build is regenerated after #21/#22.
- Wake lock is unsupported on some TV browsers (silent fallback).
