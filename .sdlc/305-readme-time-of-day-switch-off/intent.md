## Problem
README.md's feature list does not mention two chore options merged this week: **Time of day** (#297/#299: Morning / After school / Evening label on a chore) and **Switch off until** (#300/#302: a chore is switched off for the season and switches back on after the date). CLAUDE.md already documents both fields. Found by the Saturday cleanup docs check.

## Outcome / acceptance criteria
- [ ] README Features has a **Time of day** line (Morning / After school / Evening label)
- [ ] README Features has a **Switch off until** line (seasonal; chore never due and does not reset until the date)

## Affected users
Parents reading the README.

## Constraints
- Docs only; no `src/` change, so no root rebuild. Cost guardrails unchanged (GitHub Pages, free Spark RTDB, no new services).

## Open questions
None.

## Verification
Vitest docs test reads README Features; `npm test` and `npm run build` pass.


