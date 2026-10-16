# Intent — #85 Member avatars (part of #56)

(Copied from issue #85)

## Problem
Members are colour chips only; kids (and the TV) would recognise an emoji faster than a name.

## Outcome / acceptance criteria
- [ ] Admin Panel: each member row has an avatar picker from a fixed list of emoji (no free text)
- [ ] `members/<name>/avatar` saved with `patchMember` only; admin-only guard; invalid values rejected
- [ ] Avatar shown on the member chip, the leaderboard rows and the TV strip
- [ ] Tests

## Affected users
Admin (sets), members, readonly TV view.

## Constraints
Cost guardrails (Pages + Firebase Spark, no new services). One short string per member. Never touches `pinHash`.

## Open questions
None.

## Verification
`npm test` and `npm run build` pass.
