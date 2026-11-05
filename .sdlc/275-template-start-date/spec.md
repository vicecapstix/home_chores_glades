# Spec #275 — template monthly chores start due, not overdue
**Behaviour:** `initialLastDone` unwraps `freq` once (`kind`) and uses it for the weekdays and monthly checks, so a template entry object behaves like the freq string used by the Add form. Other frequencies already worked via `freqDays(object)`.
**UI:** none; admin applies templates (existing admin guard). Member/TV see chores no longer falsely Overdue.
**Data:** none changed; only the `lastDone` value written for new template tasks.
**Security/cost:** pure function fix; no new writes, no Firebase/rules/auth change.
**Concerns:** none.
