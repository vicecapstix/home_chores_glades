# Intent: README drift (#385)

## Problem
README.md "Features" omits shipped features: Bonus chore of the day (#360), Reward stock (#357), Chore minutes (#358), Text size (#356), Chore search (#354), TV Tomorrow panel (#355), Backup reminder (#359) and Data size readout (#353).

## Outcome / acceptance criteria
- [ ] README Features lists each of the eight features above
- [ ] A Vitest test fails if those mentions are removed

## Affected users
Docs only (admin, member, TV unaffected).

## Constraints
Docs and one test; no src/ change, no dependencies, no Firebase changes. Cost guardrails unchanged.

## Open questions
None.

## Verification
tests/docs-readme-385.test.js; npm test; npm run build.

