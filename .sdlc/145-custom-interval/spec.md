# Spec: #145 "Every N days" recurrence

## Behaviour
- New frequency `freq: 'interval'` with `intervalDays` (whole number 2-60). Offered as "Every N days" in the add form and the edit card, with a number input shown only for that choice.
- Invalid N (blank, <2, >60, fractional) is rejected with a toast; nothing is written.
- `freqDays(task)` returns N, so reset (calendar-day, #102), `dueStatus` (soon at N-1, overdue at N, dueTime aware), initial lastDone, skip (#92), pause resume (#70) and rotation (#54, advance on reset) work unchanged through the shared code paths.
- Points: N<=2 -> 1, <=7 -> 3, <=14 -> 5, else 8, times difficulty.
- Label: "Every 3 days" on cards and the TV view (both use `freqLabel`).
- Templates store and re-apply `intervalDays` (invalid value falls back to 7).

## UI states
- Admin: sees the option and number field (add + edit). Member: sees the label only; write paths keep `READONLY` / admin guards. Readonly TV: label only.

## Data shape (/state)
`tasks.<id>.intervalDays?: number` (only when freq is interval); `templates.<id>.tasks[].intervalDays?: number`. One optional number per task; no growth. History cap 500 unchanged.

## Security / RBAC
No new write paths; addTask/saveTask/saveTemplate/applyTemplate keep existing guards. Number is validated client side and in the draft `firebase-rules.json` (not applied automatically). The live rules are untouched. Note: if the draft rules are later adopted, they now allow `interval`.

## Cost guardrail check
GitHub Pages + existing RTDB, no new services, keys or deps. Passes.

## Flagged concerns
- Old clients (cached PWA) would treat unknown freq 'interval' as 7 days until updated. Acceptable.
- CSV export prints freq `interval` without N (not in scope).
