## Problem
Found by the weekly deep bug hunt (reproduced). `src/restore.js` caps restored history with `.slice(0, HISTORY_CAP)`. History is stored oldest-first and `appendHistory` keeps `slice(-cap)`, so restoring a backup with more than 500 entries keeps the **oldest** 500 and drops the newest activity (feeds Last week, team goal, My progress).

## Outcome / acceptance criteria
- [ ] Restore keeps the newest 500 entries (`slice(-HISTORY_CAP)`), in oldest-first order
- [ ] Backups with ≤500 entries are unchanged

## Affected users
Admin restoring a backup; everyone's history views.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500, redemptions cap 100) and reads small. Never write to or change rules on the live DB; tests mock Firebase.

## Open questions
None.

## Verification
Vitest: backup with 600 entries t0…t599 → restored history starts at t100 and ends at t599.

