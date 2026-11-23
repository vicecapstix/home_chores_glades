# Spec: one-member TV/tablet view `?readonly=1&member=<name>` (#398)

## Behaviour
- `config.js` reads `member` from the URL only when `readonly=1` (`TV_MEMBER`, trimmed, max 60 chars).
- `tvMember(members, raw)` resolves it against `state.members`: exact name first, then case-insensitive; returns the canonical member name or '' (unknown / empty / not loaded yet -> full board).
- When resolved, the board shows only chores assigned to that member plus 'Anyone' chores (`_visibleTasks`), so header counts, filters and sections all follow. The points strip shows only that member's chip (name, points, streak, away, goal, owed); the champion line is dropped.
- `cycle=1` and `text=` are independent URL params and keep working.

## UI states
- Admin / member app (not readonly): `member` param ignored entirely.
- Readonly TV/tablet: filtered board + single chip. Unknown name: unchanged full board.

## Data shape
None. Display only; nothing written or stored.

## Security / RBAC
READONLY stays true: no writes, no login. The URL name is never inserted as HTML: only the canonical `state.members` name is shown, via `esc()`. The view shows nothing that the full TV board does not already show (anyone with the URL can load the full board), so it is a convenience filter, not an access control; stated in the PR.

## Cost guardrails
No new reads or listeners; same onValue snapshot. No deps/services.

## Concerns
Filtering is client-side only (not privacy).
