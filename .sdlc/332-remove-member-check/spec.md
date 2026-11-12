# Spec #332 — removeMember clears the removed member's pending parent check
Behaviour: in `removeMember` (admin only, unchanged guards), every task with `checkPending.by === name` gets `checkPending` removed in the same `patchPaths` multi-path write (null) and locally.
UI: admin sees the To-check count drop; members can tick the chore again. Readonly TV: no write path, unchanged.
Data: only deletes `tasks/<id>/checkPending` of the removed member's own request; no new fields, no reshaping beyond that.
Security/RBAC: existing `READONLY || !isAdminFn()` guard covers it. No rules/auth/PIN change.
Cost: no new reads/writes beyond one extra path in an existing multi-path update.
Concerns: none; rename-member (#274/PR #291) is separate.
