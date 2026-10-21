# Spec — #124 'Next up' rotation tag
## Behaviour
Chore cards (and the TV list, which reuses `cardHTML`) show "🔁 next: <name>" for chores with a rotation of 2+ current members; name = who gets it on next reset (`nextRotationPerson`). No tag for non-rotating or one-off chores.
## UI states
Admin, member and read-only TV: identical, display only.
## Data shape
None. No new writes.
## Security / RBAC
Names go through `esc()`. No write path.
## Cost guardrails
No services, deps or Firebase traffic.
## Flagged concerns
The tag reflects current local state; if a device has not yet seen a reset it shows the person for that reset.
