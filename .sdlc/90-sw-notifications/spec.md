# Spec #90
Behaviour: overdue reminders go through `navigator.serviceWorker.ready` -> `registration.showNotification()` when a SW exists; otherwise `new Notification()` inside try/catch. A task id is recorded as notified only after a notification was actually shown; a throw/reject leaves it eligible for the next 30-min check. In-flight ids are tracked so overlapping checks don't double-fire. `sw.js` gains `notificationclick` (focus existing client or open the app) and its cache name is bumped.
UI states: admin/member identical (button + permission flow unchanged; only the current member's own overdue chores). Read-only TV: no member logged in so nothing is sent; unchanged.
Data shape: none. No Firebase reads/writes.
Security/RBAC: no write path; no user data in innerHTML (task name only in notification body text). Click handler only focuses/opens same-origin scope URL.
Cost guardrail: local notifications only, no push/FCM/keys/services; no DB traffic; history cap untouched.
Concerns: SW `ready` never resolves if no SW registered (dev/http) -> use `getRegistration()` check first, fall back. Cached old sw.js replaced via cache-name bump (v2).
