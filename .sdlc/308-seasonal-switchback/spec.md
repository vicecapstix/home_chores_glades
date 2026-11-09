# Spec — #308 seasonal switch-back
**Behaviour:** (1) `checkOffExpiry` on a `done` chore removes only `offUntil` (lastDone/lastDoneBy/history untouched); not-done chores still get `lastDone = initialLastDone` (due that day). (2) `checkOffExpiry` returns early while `state.pause` is set, like `checkTaskResets`; after the resume it runs and the chore is due. (3) `dueStatus` shows an expired, not-yet-cleared `offUntil` chore (not done, not once) as if switched back on (display only, no write), so the readonly TV is right.
**UI states:** admin/member: unchanged except a done chore no longer shows "Done yesterday" after switch-back. TV: expired chore shows Due soon, not Overdue.
**Data shape:** none; fewer `lastDone` rewrites. **RBAC:** `READONLY` guard unchanged; no new write path. **Cost:** none.
**Concerns:** two assertions in `seasonal-offuntil.test.js` encoded the old behaviour (expired → overdue; done chore → lastDone rewritten) and were updated.
