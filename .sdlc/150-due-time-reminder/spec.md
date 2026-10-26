# Spec: due-time reminder (#150)

## Behaviour
- On every rollover tick (existing 60 s timer and visibilitychange, #88) `runDueTimeCheck()` runs. A chore qualifies when: it has a valid `dueTime`, is not done, `dueStatus` is overdue (so skipped and paused chores never qualify), its due date is today (`dueTimePassedToday` in utils.js), and it is assigned to the logged-in member or to nobody ("Anyone").
- One notification per chore per local day, tracked by a device-local localStorage flag (`ff_due_notified` = `{date, ids}`); only recorded after the notification was actually shown. Delivery reuses the #90 path (`registration.showNotification`, constructor fallback) with tag `ff-due-<id>`.
- Needs notification permission already granted (existing 🔔 button flow). No new timer.

## UI states
- Admin / member on phone or tablet: reminders. Readonly TV: `READONLY` guard returns immediately (TV never has a logged-in member either).

## Data / RBAC / cost
- No /state changes, no writes, no reads. Local notifications only, no push/FCM/backend. Spark-plan safe.

## Concerns
- Chores that were overdue before today are covered by the existing 30-minute overdue check, not this one.
- Reminders only fire while the app is open or backgrounded but alive (local notifications; no push service by design).
