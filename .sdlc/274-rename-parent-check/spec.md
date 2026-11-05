# Spec #274 — rename keeps parent checks payable
**Behaviour:** `renamePaths` also rewrites `tasks/<id>/checkPending/by`, `redemptions/<id>/givenBy` and `pause/by`. History is no longer renamed by array index; a new `renameHistoryPerson(old,new)` transaction on `state/history` renames `person`, `by`, `checkedBy` by matching the old name on the live array. `renameMember` runs it after the multi-path update; a failure only toasts a warning.
**UI:** no UI change. Admin only (existing `READONLY || !isAdminFn()` guard); TV/readonly cannot rename.
**Data:** no new fields; existing name fields are rewritten. History length unchanged (cap 500 kept). No `/admins` write (stays in #253).
**Security:** admin-gated, no HTML output, no PIN data touched (record copied unchanged).
**Cost:** one extra transaction on an already-synced path; Spark plan, no new service.
**Concerns:** history rename is a second write after the member move, so a failure leaves old names in history (warned by toast).
