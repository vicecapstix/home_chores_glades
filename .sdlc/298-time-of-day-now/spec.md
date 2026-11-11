# Spec: Time of day part 2: grouping and Now filter

**Behaviour:** currentSlot(now) = morning <12:00, afternoon 12:00-16:59, evening >=17:00 (local). todRank orders chores within each status section (Available/Overdue/Due soon/Upcoming/Done) before the existing order. A "Now" filter pill (count included) keeps chores whose timeOfDay equals the current slot or is empty/invalid. rollover.js signature includes the slot so an open screen re-renders at 12:00 and 17:00.

**UI states:** admin and member: Now pill beside Mine/All/Pending/Overdue/Done; combines with category pills (AND). Readonly TV: same ordering and pill, display only; no controls added.

**/state:** no change (reads existing timeOfDay). **Security/RBAC:** read-only display logic, no new writes, no new window.* handlers beyond existing setFilter. **Cost:** none. **Concerns:** the Now pill is a separate button string, not in the status `defs`, so the README/docs test on the five status labels is unchanged.
