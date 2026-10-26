# Spec #166
- Behaviour: members get a stored colorIdx (0..5). One helper memberColor(name, names?) in state.js (ui.pColor delegates) is used by chips, chore tags, leaderboard, stats, history, TV strip and the login picker. Members lacking colorIdx fall back to their list position (today's colour).
- New members: colorIdx = least-used colour (lowest on ties). Rename copies the record so the colour stays. Remove frees the colour.
- Backfill: once per page load, after an admin logs in, one patchPaths with members/<n>/colorIdx = current displayed colour for members missing it, so nobody's colour changes.
- UI: same for admin/member/TV; TV never writes (READONLY guard, admin only).
- Data: +1 small number per member; allowed by draft rules (no rules change).
- Cost: one small write per member once. Concern: legacy members shift until an admin has loaded the app once.
