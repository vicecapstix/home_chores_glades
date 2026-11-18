# Spec #350
Behaviour: a chore with `offUntil` is hidden only on plan days whose date is <= offUntil. Days after show it normally.
- weekPlan (This week + .ics, which reuses weekPlan): per-day check against the day's date.
- Print chart: per-day boxes masked the same way; "Any day" chores hidden only when offUntil >= Sunday of the week.
- Chore off the whole week: still absent everywhere.
UI states: admin/member see the planner/.ics; print chart admin-only; TV (readonly) unaffected, no UI change.
Data shape: none. No /state change. Display only; daily goal/team goal (utils ~405, render counts) keep using isOffNow unchanged.
Security/RBAC: unchanged (print remains admin-only, READONLY guarded). Cost: none.
Concerns: weekly/monthly chores whose computed due day falls in the off window are dropped for that week (unchanged-ish; they return after offUntil via normal due calc).
