# Spec: calendar-month recurrence (#137)

## Behaviour
- Due date of a monthly chore = local calendar date of `lastDone` plus one calendar month, with the day clamped to the target month's last day. Same time of day is irrelevant (comparison is by local calendar day, as for other frequencies).
- Reset (`checkTaskResets`): a done monthly chore un-checks at local midnight of its due date.
- `dueStatus`: 'soon' the day before the due date, 'overdue' on/after it; the optional `dueTime` uses the same due date.
- Implemented as `cycleDays(freq, lastDone)` (days in the current cycle; = `freqDays` for non-monthly, so other frequencies are unchanged) and `addMonthClamped`. `freqDays('monthly')` stays 30 as a generic fallback value.
- `initialLastDone('monthly')` = one calendar month before now (clamped), so a new chore is due immediately, as before.
- `computeResumePatch` is unchanged: it shifts `lastDone` by the pause length; the calendar rule then applies to the shifted anchor (consistent with weekly/fortnightly). Pause freezing of resets is untouched.
- DST: all arithmetic uses local calendar fields (`setMonth`/`setDate`, `daysSince` via UTC of local Y/M/D), never 86400000 ms multiples.

## UI states
- Admin / member / readonly TV: no UI change. Existing due colours (ok/soon/overdue) and the reset simply follow the new date.

## Data shape
None. Derived from `lastDone`; no new `/state` fields.

## Security / RBAC
No new write paths. The only write remains the existing `checkTaskResets` patch (already guarded by `READONLY`).

## Cost guardrail check
No new services, keys, deps or DB reads/writes. GitHub Pages + Spark unchanged. History cap untouched.

## Flagged concerns
- Existing monthly chores keep their `lastDone`, so the first cycle after deploy moves to "same date next month" from the last completion; no migration needed.
- Chore done on the 31st: next due falls on the 30th/28th/29th in short months, and the following cycle anchors from that completion date (anchor = last completion, per the issue's assumption).
- Pause resume shifts by milliseconds, so across a DST change the shifted time of day can move by an hour; the calendar day is what matters.
