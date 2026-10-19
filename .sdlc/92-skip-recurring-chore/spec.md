# Spec — #92 Skip this occurrence of a recurring chore

## Behaviour
- Admin-only "Skip" button (⏭) on cards of recurring chores (`freq !== 'once'`) that are not done. Tapping it calls `skipTask(id, isAdminFn)` (src/tasks.js).
- `skipTask` writes only `patchTask(id, { lastDone: now, skippedAt: now })`. No points, no history entry, no streak/member change, `lastDoneBy`/`lastDonePoints` untouched. Pushes an undo that restores the previous `lastDone` and `skippedAt` (null when absent).
- "Skipped" state = `!done && skippedAt && skippedAt === lastDone` (`isSkipped` in utils). It needs no cleanup: ticking the chore or any later change to `lastDone` ends it.
- `dueStatus`: a skipped chore reports `ok` unless it is already `overdue` again (e.g. a weekly chore skipped 8 days ago). Weekday chores: `lastDone = now` is past the last scheduled start, so they are `ok` until the next scheduled day.
- Card shows a "Skipped today" tag (or "Skipped" on later days) instead of "On track".

## UI states
Admin: Skip button visible. Member: button hidden (CSS `body[data-role="member"]`) and `skipTask` refuses. Readonly TV: button hidden (`body[data-readonly]`); sees the "Skipped" tag and the chore as not due.

## Data shape (/state)
`tasks/<id>/skippedAt`: optional number (ms). One field per task, overwritten on each skip: no growth.

## Security / RBAC
`if (READONLY || !isAdminFn()) return;` first line. Single granular `patchTask`; no full-state write.

## Cost guardrails
One tiny field and one small write per skip. Pass.

## Concerns
- Skipping a daily chore sets `lastDone = now`, so it turns overdue 24 h later (not at midnight); that is existing daily behaviour tracked in #102.
