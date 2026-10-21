# Spec #69
Behaviour: `initialLastDone('weekdays')` = local start of today minus 1 ms. Created/applied on a scheduled day -> `soon` that day; on a non-scheduled day -> `ok` until the next scheduled day (never overdue for earlier days). Editing a not-done task from another freq to 'Specific days' resets lastDone the same way; re-saving an existing weekdays task keeps lastDone.
UI: no visible change except correct due lists; same for admin / member / read-only TV.
Data shape: none (lastDone value only). No migration.
Security/RBAC: saveTask already guarded by READONLY + isAdmin; no new write paths.
Cost: no new reads/writes; same single writeState. History cap untouched.
Concerns: two existing assertions in tests/weekdays.test.js encoded the old `lastDone = now` value and were updated (disclosed in PR).
