# Spec: #177 points on chore cards

## Behaviour
- `cardHTML` adds `<span class="tag tag-freq tag-pts" aria-label="worth N points">+N pts</span>` after the difficulty tag, N = `taskPoints(t)` (a number, so nothing user-supplied to escape).
- Not rendered when `t.done` (points are already earned).
- Singular "worth 1 point" for N = 1.

## UI states
- Admin and member: shown on every not-done card, including in select mode.
- Readonly TV: same markup (cardHTML has no readonly branch), so shown there too.

## /state data changes
None. Display only.

## RBAC
No writes. No new guards.

## Cost guardrails
No Firebase reads/writes, no deps, no new services.

## Concerns
- Adds one more tag to an already full meta row; it wraps (flex-wrap) on phones. Uses the existing muted tag style, whose contrast is already >= 4.5:1.
