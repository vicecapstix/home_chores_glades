# Spec: roll back a tick when the points update fails (#379)

**Behaviour:** `applyToggle` (check path) saves the task as done first. If `adjustMemberPoints` returns `{ok:false}` or throws, the task is patched back to not-done (`lastDone` restored, `prevLastDone`, `lastDoneBy`, `lastDonePoints`, `lastDoneWeek`, `prev*`, `lastDoneBadges` cleared), the existing "Member update failed" toast shows, no history entry is written, and the function returns `false` (a parent-check request is then kept by the caller). Success path unchanged.

**UI states:** admin/member: toast, chore shows not done. Readonly TV: no write paths, unaffected.
**Data shape:** none new; one extra `patchTask` on the failure path only.
**Security/RBAC:** no new entry points; existing READONLY/admin guards in `toggleTask` unchanged.
**Cost guardrails:** no new reads/writes except the failure-path patch; no services, deps or rules.
**Flagged concerns:** if the rollback patch itself fails (offline) the task stays done; the pending-write retry is dropped so the bare write isn't replayed (#271). The `!m` (member missing locally) early return is not changed here.
