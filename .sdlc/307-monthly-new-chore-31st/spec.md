# Spec — #307 new monthly chore on the 29th–31st

**Behaviour:** `initialLastDone('monthly', now)` starts from `addMonthClamped(now, -1)`. When that month is shorter, the cycle ends before today. The anchor now moves forward a day at a time until the cycle reaches today, so a new monthly chore is "soon" (due), never "overdue", on any creation day. Created on 15 Oct: unchanged (15 Sep).
**UI states:** admin Add/templates/starter/chore-file/seasonal switch-back see the chore as due, not overdue; member and readonly TV show the same (pure function, display only).
**Data shape:** none. Only the `lastDone` value written for a brand-new monthly chore differs on days 29–31.
**Security/RBAC:** none, no new write path. **Cost guardrails:** no new services, no extra reads/writes.
**Concerns:** existing test `monthly-calendar.test.js` asserted the buggy outcome (overdue on 31 Mar); updated to the new rule.
