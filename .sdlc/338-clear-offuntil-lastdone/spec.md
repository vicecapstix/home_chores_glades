# Spec #338
Behaviour: in saveTask, when the chore was off (isOffNow) and the form leaves it with no valid future offUntil, a non-once, not-done chore gets lastDone = initialLastDone(task) (due today), same as switchOnNow / checkOffExpiry. Otherwise lastDone is untouched.
UI: admin edit form only. Member and readonly TV just see the chore as due instead of overdue.
Data: no new /state fields; the existing `lastDone` path in the saveTask patch carries the value.
Security/RBAC: saveTask is already guarded (READONLY, admin); no new write path.
Cost guardrails: no new services, rules, deps or data growth.
Concerns: none.
