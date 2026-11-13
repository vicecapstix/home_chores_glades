# Spec #316
Behaviour: This week modal gets a "Chores for" picker (Everyone / Anyone (unassigned) / each member) and a "Download calendar (.ics)" button. weekics.js builds an RFC 5545 file from weekPlan(): chores with dueTime become 30-minute floating-local events, others all-day events. Text is escaped and lines folded at 75 chars. Saved through a Blob; no fetch, no feed URL.
UI states: admin and member see the toolbar; readonly TV hides it (CSS body[data-readonly] .week-ics, plus a READONLY guard in downloadWeekIcs).
Data: none. No /state change, no writes.
Security: names go into the file only via icsEscape; picker options use esc(); no HTML injection of chore names.
Cost: no services, deps or data.
Concerns: floating local time means the calendar app interprets it in the phone's time zone (intended for a family in one place).
