# Spec — #94 Family daily goal

## Behaviour
`todayProgress(tasks, now)` returns `{done, total}`:
- done: `task.done` and `lastDone` falls on the local date of `now`.
- pending (counts in total only): not done, not skipped, and either `dueStatus` is `overdue`, or due today (weekdays scheduled today, or `once` with `dueDate === today`).
- Everything else (future, done on earlier days) is ignored. `total === 0` hides the bar.

A bar "Today: X of Y chores done" sits in the header (all views) and is enlarged on the TV (`body[data-readonly]`, >=1200px).
When a render sees done === total > 0 after having seen done < total this session, and the per-device flag `ff_goal_day` (localStorage) differs from today, it sets the flag, plays a CSS-only pulse/confetti animation (disabled under `prefers-reduced-motion`) and calls `showToast` (the `role=status` region) with "All of today's chores are done!".

## UI states
- Admin / member: bar in header, celebration on completion.
- Readonly TV: same, larger; celebration plays (device-local flag).
- No chores due: bar hidden.

## Data
No change to `/state`. Only a localStorage key (try/catch wrapped).

## Security / RBAC
No writes, no new handlers. Output is numeric text only; no user strings rendered.

## Cost guardrails
Client-side only; no new reads/writes, deps, or services.

## Concerns
A page loaded with everything already done does not celebrate (no transition seen) - intended. Weekly/monthly chores only count once overdue.
