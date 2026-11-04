# Spec: #248 Rewards Request buttons use the logged-in member

## Behaviour
- Request buttons (enabled state, "n/limit this week" text) are computed from the logged-in member (`meFn()`), never from the `#goal-target` pick.
- `#goal-target` only changes which member the saving goal ("Make this my goal"/"Clear goal", goal bar, points line) applies to.
- The points line keeps showing the picked member's points (labelled "Kid's points").

## UI states
- Admin: dropdown visible; Request reflects admin's own points; goal buttons reflect picked member.
- Member: no dropdown; unchanged.
- Readonly TV: no `me`, no buttons; unchanged.

## Data / security
- No /state shape change. `requestReward` already files for the logged-in member; no rules/auth/PIN changes.
- Cost guardrails: client-only change, no new services or reads.

## Concerns
- Mum with 0 pts and no way to request for a child is intended (issue: kids request on own login).
