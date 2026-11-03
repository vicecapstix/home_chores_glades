# Spec — #272 Check approved after week rollover

## Behaviour
- When a parent approves a "needs check" chore, the points belong to the week of the child's tick (`checkPending.at`), not the approval time.
- `lastDoneWeek` = `getWeekStart(new Date(nowTs))` (tick time). History already uses the tick time, so history, `lastDoneWeek` and `weekPoints` now agree.
- If the tick's week is not the current week, `adjustMemberPoints` is called with `countWeek: false`: all-time `points` and `completedCount` still rise, `weekPoints`/`weekStart` are untouched.
- Uncheck: existing logic compares `lastDoneWeek` with the current week, so a late-approved chore (old week) does not touch the current week; a same-week one reverses as today.
- Same-week approval and ordinary (non-check) ticks are unchanged (`nowTs` is now, so tick week = current week).

## UI states
No new UI. Admin "Looks good", member board, and read-only TV strip just show the corrected This-week totals.

## Data shape
No change to `/state` (`lastDoneWeek` already exists; only the value written differs).

## Security / RBAC
No change; `approveCheck` keeps the `READONLY || !isAdminFn()` guard and atomic `takeCheckPending`. No rules/auth/PIN changes.

## Cost guardrails
No new services, deps, reads or writes. Stays on Pages + Spark RTDB.

## Flagged concerns
- A late approval of a last-week tick leaves no `weekPoints` for it, but the last-week recap (from history) includes it: this is the intended consistency.
