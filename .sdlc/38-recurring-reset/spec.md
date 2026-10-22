# Spec #38
Behaviour
- checkTaskResets: when a recurring (incl. 'weekdays') done task resets, every ticked subtask is also set done=false, as leaf paths in the SAME single patchRoot multi-path update (never a full-state set). Rotation (nextRotationPerson) logic untouched. 'once' tasks, paused state and READONLY behave as before. Tasks not done are never touched (no wiping of partial progress on overdue tasks).
- Done section is labelled "Done" (was "Done today"); filter pill likewise. Done cards get a tag derived from lastDone by calendar day: "Done today" / "Done yesterday" / "Done N days ago". New pure helper doneAgoLabel(ts, now) in utils.js.

UI states: admin/member/TV render the same tag (constant strings + a number, no user data). Read-only TV: resets computed locally for display but not written (existing READONLY guard).
Data shape: no new fields. Writes only tasks/<id>/subtasks/<sid>/done=false leaves.
Security/RBAC: no new write path; reset already guarded by READONLY.
Cost guardrail: a few extra leaf paths in the existing one update; no new reads; history cap untouched.
Concerns: only subtasks currently done are written (minimal payload).
