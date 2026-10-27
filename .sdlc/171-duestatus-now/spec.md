# Spec: dueStatus honours `now` (#171)

## Behaviour
- `baseStatus(t, now)` in `src/utils.js`:
  - `freq: 'once'`: "today" and "tomorrow" are computed from `new Date(now)` instead of `new Date()`.
  - `freq: 'weekdays'`: `prevScheduledStart(t.days, now)` and "start of today" from `new Date(now)`.
  - recurring (`daysSince(lastDone, now)`) already used `now`; unchanged.
- `now` still defaults to `Date.now()`, so every existing caller that omits it behaves exactly as before.
- Effect: `todayProgress(tasks, now)`, `dueTimePassedToday`, the rollover signature and tests get answers for the time they pass, fixing wrong results around midnight when a caller captured `now` slightly earlier.

## UI states (admin / member / TV)
No visible change in normal use: all render paths call `dueStatus(t)` with the default `now`.

## Data / RBAC / security
No `/state` reads or writes change. No new write paths, no user data in HTML.

## Cost guardrails
Pure function change; no network, no Firebase.

## Concerns
None.
