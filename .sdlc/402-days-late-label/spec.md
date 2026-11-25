# Spec: days-late label (#402)

## Behaviour
Overdue cards show a text tag after "Overdue": `Due today` (overdue by dueTime on its due day), `1 day late`, `N days late`.
Days are whole local calendar days from the chore's due day to today (`daysSince`, Date.UTC based, DST-safe).
Due day: once = dueDate; weekdays = most recent scheduled day (`prevScheduledStart`); others = lastDone + cycleDays.
Only shown when `dueStatus(t) === 'overdue'`, so paused, away, switched-off, done, skipped and waiting-for-check chores never show it.

## UI states
- Admin / member (phone): tag in the card meta row, next to the Overdue tag.
- Readonly TV (`?readonly=1`): same card HTML, no controls; label is plain text.
- Accessibility: text only (no colour-only meaning, no aria hiding); output via `esc()`.

## /state shape
No changes. Computed at render time. No writes.

## RBAC
None: display only, same visibility as the existing Overdue tag.

## Cost guardrails
No new services, deps, keys or Firebase reads/writes. Static code on GitHub Pages only.

## Flagged concerns
- Weekdays chores without dueTime are never "Due today" while overdue (they are "due soon" that day).
- An overdue-by-dueTime chore later the same day shows "Due today"; this is the only 0-day case.
