## Problem
README.md's feature list (lines ~10-45) is missing features merged in the last week: **Parent check** (#238 — chores can wait for a parent's "Looks good" before points), **Extra job claims** (#224 — a child logs an unlisted job, parent approves points), **Double-points day** (#225), and the admin **Fairness report** (#226). CLAUDE.md already documents them.

## Outcome / acceptance criteria
- [ ] README feature list has one line each for Parent check, Extra jobs, Double-points day and Fairness report, matching the current UI wording
- [ ] No other README behaviour claims are wrong (spot-check Roles and Activity history lines)

## Affected users
Parents reading the README.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500, redemptions cap 100) and reads small. Never write to or change rules on the live DB; tests mock Firebase.
- Docs only; no `src/` change, so no root rebuild needed.

## Open questions
None.

## Verification
Review the diff; `npm test` and `npm run build` still pass.

