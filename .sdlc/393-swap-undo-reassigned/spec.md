# Spec — #393 swap undo when the chore was reassigned
**Behaviour.** In `acceptSwap`'s undo, if the chore's `person` is no longer the member who accepted, undo now throws (`the chore has been reassigned`). `undo.js` already turns a throw into "Restore failed: <reason>". Previously it returned silently and the toast said "Restored".
**UI states.** Member: toast text changes only in the reassigned case. Admin: same (undo is per session). Readonly TV: no undo, unchanged.
**Data.** No /state shape change. No new writes; the throw happens before any write.
**Security/RBAC.** None new; `acceptSwap` still guarded by READONLY and `s.to === me`.
**Cost guardrails.** No service, dependency or data-volume change.
**Concerns.** None.
