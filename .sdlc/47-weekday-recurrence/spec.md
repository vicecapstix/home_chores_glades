# Spec — #47 Weekday-based recurrence
Behaviour: new freq `weekdays` ("Specific days") with `days: number[]` (0=Sun..6=Sat, JS getDay, device local time). Occurrence = the most recent selected day that has started (today or earlier). Not done & last completion before that day began -> due: `soon` ("Due soon") on the day itself, `overdue` once the day has passed. Completed since that day began -> `ok`. A done task resets (checkTaskResets) as soon as a later selected day begins. Points base = weekly (3). New weekday tasks start as "completed now" so the first occurrence is the next selected day. No days selected -> never due (UI blocks saving with a toast). Existing freqs untouched.
UI states: admin — "Specific days" in the freq select reveals Mon..Sun toggle chips (new + edit); member/TV — tag shows "Mon, Thu"; status via existing sections.
Data shape: tasks/<id>/days: number[] (new optional field, only for freq weekdays; tiny). Templates also carry `days`.
RBAC: addTask/saveTask already admin-only; no new write paths. Cost: none.
Concerns: uses device-local day boundaries (TV/phones in the same timezone); weekly "Done today" label unchanged (#38 tracks).
