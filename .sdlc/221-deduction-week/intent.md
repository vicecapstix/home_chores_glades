# Intent (#221)

## Problem
`src/bonus.js` passes `countWeek: amount > 0`, so a negative adjustment never lowers `weekPoints`, while `weekRecap` (`src/utils.js`) sums all bonus history including negatives. The member shown on top all week can lose the 'Last week' champion title on Monday.

## Outcome / acceptance criteria
- [ ] This week and Last week agree for the same week after a deduction
- [ ] weekPoints never goes below 0

## Affected users
Members, readonly TV.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500) and reads small. Never write to or change rules on the live DB; tests mock Firebase.

## Open questions
None.

## Verification
Vitest: apply a −5 bonus, compare `currentWeekPoints` with `weekRecap` for that week.

