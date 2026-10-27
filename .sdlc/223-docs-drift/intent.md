# Intent: Docs drift — README filters/features and CLAUDE.md task shape (#223)

## Problem
README lists filters as 'All / Pending / Overdue / Done today' (real pills: Mine/All/Pending/Overdue/Done) and omits Every-N-days, skip, pause, bonus and saving goal. CLAUDE.md's task shape lacks `'interval'`, `intervalDays`, `rotation`, `skippedAt`, `prevLastDone`, `lastDoneWeek`, `prevStreak*`.

## Outcome / acceptance criteria
- [ ] README filters and feature list match the app
- [ ] CLAUDE.md task data shape lists every field written by src/

## Affected users
Maintainers, family members reading the README.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500) and reads small. Never write to or change rules on the live DB; tests mock Firebase.

## Open questions
None.

## Verification
`tests/docs.test.js` extended to check the filter names; `npm test` passes.

