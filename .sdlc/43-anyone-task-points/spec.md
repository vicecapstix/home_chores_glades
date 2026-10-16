# Spec — #43

## Behaviour
`toggleTask` computes `awardee = t.person || me` where `me` is the logged-in member, accepted only if it exists in `state.members`. When checking, `awardee` receives points, streak, badges, `lastDoneBy`/`lastDonePoints`, and a history entry whose `person` is `awardee`. `t.person` itself is NOT changed (the task stays 'Anyone'). Unchecking already uses `lastDoneBy`/`lastDonePoints`, so it reverses the points; history entries are out of scope here (see #32).
If there is no awardee (setup mode, no session, unknown name) the task is still toggled but no points, member patch or history are written.

## UI states
- Admin: ticks an Anyone task -> admin earns the points.
- Member: same for themselves; assigned tasks of others stay blocked (unchanged).
- Readonly TV: `READONLY` returns early; no change.

## Data shape
No new fields. `lastDoneBy`/`lastDonePoints` now also set for Anyone tasks. No migration.

## Security / RBAC
Existing guards unchanged (READONLY; non-admin can only tick own or unassigned tasks). Points go only to the caller's own member record; no new write paths.

## Cost guardrails
No new reads/writes types; history still capped at 500. Pass.

## Concerns
Check/uncheck by a different person: uncheck reverses points from `lastDoneBy` (the original earner), preventing point farming.
