# Intent (#220)

## Problem
Regression of part of #32: the check path awards badges (`src/tasks.js` ~282-286); the uncheck path reverses points, count and streak but never `badges`. A child at 9 completions ticks, earns the 10-completion badge, unticks — count back to 9, badge stays. Same for streak badges.

## Outcome / acceptance criteria
- [ ] After an uncheck, badges whose `check` no longer passes are removed
- [ ] Badges earned earlier for other reasons are kept

## Affected users
Members (chips, leaderboard, TV).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500) and reads small. Never write to or change rules on the live DB; tests mock Firebase.

## Open questions
None.

## Verification
Vitest: member at 9 completions, check then uncheck → `patchMember` restores badges without the new one.

