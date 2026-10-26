# Spec #161
- Behaviour: `todayProgress` counts a not-done recurring chore with a valid `dueTime` when its current due date (lastDone + cycle) is today, even though `rawDueStatus` says `soon`. Due tomorrow stays excluded. Skipped/paused unchanged (checked before / via dueStatus).
- UI: admin, member and readonly TV all show the corrected goal bar/celebration; no markup change.
- Data: none. RBAC: none (display only). Cost: no reads/writes added.
- Concern: a chore due tomorrow-early-morning is 'soon' but excluded (date-based, intended).
