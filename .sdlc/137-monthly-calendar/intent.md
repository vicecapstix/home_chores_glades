# Intent: issue #137 - Monthly chores follow the calendar

## Problem
`freqDays('monthly')` is 30 (`src/utils.js`), and `checkTaskResets`/`dueStatus` treat "monthly" as 30 days since `lastDone`. A chore done on the 1st comes back on 31 Jan -> 2 Mar -> 1 Apr -> 1 May... and anything done a few days late moves the whole schedule. Families expect "monthly" to mean the same date each month (e.g. change the filter on the 1st).

## Outcome / acceptance criteria
- A monthly chore resets on the same day of the next calendar month (local time), clamped to the month's last day (31 Jan -> 28/29 Feb -> 31 Mar)
- `dueStatus` 'soon'/'overdue' for monthly uses the same calendar rule
- Pause/resume shifting (`computeResumePatch`) and `initialLastDone('monthly')` stay consistent with the new rule
- Daily/weekly/fortnightly/weekdays behaviour unchanged (existing tests still pass)
- Tests: 1 Jan->1 Feb, 31 Jan->end of Feb (leap and non-leap year), a late completion on 5 Mar -> due 5 Apr, DST-safe

## Affected users
Admin (sets chores), members (see due status), readonly TV view (due/overdue colours).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features, no new services, API keys, secrets or paid hosting. History capped at 500. Never write to or change rules on the live DB; tests use mocks only.
- No data shape change: derive from `lastDone`. No new `/state` fields.
- Deploy: run `npm run build:pages` and commit the root files (CI fails on drift).

## Open questions
None. (Assumption: the anchor is the last completion date, matching how weekly/fortnightly work today.)
