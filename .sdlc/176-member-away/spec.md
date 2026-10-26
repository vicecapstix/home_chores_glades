# Spec: Away mode for one member (#176)

## Behaviour
- Admin Panel > "Away mode": pick a member and a return date (today or later), or "Back now" to end early.
- While `members/<name>/awayUntil` (inclusive local date) is today or later:
  - chores assigned to that member are never 'soon'/'overdue' (`dueStatus`, so counts, filters, notifications and "mine" follow);
  - rotations skip them at reset (`nextRotationPerson(..., away)`); if everyone else is away the assignee stays;
  - chip and TV chip show "🏕 away until Fri". 'Anyone' chores stay available to others.
- Ends automatically: any editing client runs `checkAwayExpiry()` on each snapshot (same pattern as `checkPauseExpiry`); it clears the fields and shifts `lastStreakDate` (and the member's recurring chores' `lastDone`) by the time away, like `computeResumePatch`, in one multi-path update.

## UI states
- Admin: form in Admin Panel plus "Back now" per away member. Member: sees chip text. Readonly TV: sees chip text only.

## Data
- `members/<name>/awayUntil` (YYYY-MM-DD) and `awaySince` (ms). The issue says "one field"; the second is needed because the streak shift must know when the absence began (the pause feature stores `since` for the same reason). Both are removed on return.

## RBAC
- `setAway` / `clearAway` start with `READONLY || !isAdminFn()`; expiry returns on READONLY. Names escaped with `esc()`/`jsq()`.

## Cost guardrail check
- Writes only on set / clear / expiry (single small update). No new reads, services or keys beyond the two member fields. No rules change.

## Concerns
- Task `lastDone` of the member's recurring chores is also shifted on return so they are not overdue the moment the member is back (not in the acceptance criteria; mirrors the holiday pause).
- If two admins' screens are open at expiry, the update is idempotent.
