# Spec #167
- Behaviour: while select mode is on, `cardHTML` omits the per-card action controls (subtask chevron, move up/down, skip, edit, delete, Claim, subtask section). A tap anywhere on the card only toggles selection. Unassigned chores show an inert "Anyone" tag instead of Claim. Outside select mode the markup is unchanged.
- UI: select mode is admin-only in practice; members and READONLY TV never enter it.
- Data: none. RBAC: no new writes; removes accidental write paths.
- Cost guardrail: client-side only.
- Concern: reorder (move buttons) is unavailable in select mode; leave select mode ("Done") to reorder.
