# Intent — #35 Member names containing . # $ [ ] / break Firebase keys

(Copied from issue #35)

## Problem
Member names are used as DB keys (`src/members.js`, `src/firebase.js`) without validation; names containing `. # $ [ ] /` make writes fail or create nested paths.

## Outcome / acceptance criteria
- [ ] `addMember` rejects (toast) names with `. # $ [ ] /`, empty/whitespace, or >30 chars
- [ ] Tests for each invalid char

## Affected users
Admin.

## Constraints
Cost guardrails (Pages + Firebase Spark, no new services). Client-side only; no rules/auth changes.

## Verification
`npm test` and `npm run build` pass.
