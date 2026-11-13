# Spec #317
Behaviour: when a logged-in non-admin member's own chores due today (person === member, via todayProgress) go from incomplete to complete during this session, a dismissable banner "All done for today, <name>!" shows, once per local day per member per device (localStorage key ff_mydone_day:<name>, try/catch).
Not shown on first load when already complete, for admins, or READONLY (TV): JS guard plus CSS body[data-readonly] rule.
UI: inline banner (role=status), not a modal and not a toast, so the Undo toast is unaffected; animation disabled under prefers-reduced-motion. Hides again if a chore is unticked.
Data: none; no /state change, no writes. Unassigned (Anyone) chores are not counted.
Security: member name inserted with textContent only.
Cost: no services/deps/data.
Concerns: name key means a renamed member can see it once more that day.
