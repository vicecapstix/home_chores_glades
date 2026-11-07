## Problem
Found by the weekly deep bug hunt (reproduced). The "This week" planner (`src/week.js`) colours members with `PCOLS[names.indexOf(name)]` instead of the stable `memberColor()` added in #166. After a member is removed or renamed, planner colours no longer match chips, cards and History.

## Outcome / acceptance criteria
- [ ] The week planner uses `memberColor()` (stored `colorIdx`)
- [ ] Colours match the member chip for every member after one is removed

## Affected users
Everyone using This week; TV.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500, redemptions cap 100) and reads small. Never write to or change rules on the live DB; tests mock Firebase.

## Open questions
None.

## Verification
Vitest: members A (colorIdx 2) and B; planner HTML uses PCOLS[2] for A.

