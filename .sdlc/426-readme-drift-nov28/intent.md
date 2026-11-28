## Problem
README.md's Features list and CLAUDE.md's data shapes have drifted from the code again. Features merged in the last two weeks are missing: member birthday banner (#362), per-chore streak tag (#361), parent cheer on History (#403), quiet hours (#401), admin Copy of a chore (#405), and the optional reward request note (#404). CLAUDE.md's `redemptions` shape does not list the optional `note` field.

## Outcome / acceptance criteria
- [ ] README Features has a line for each of: Birthday, Chore streak, Parent cheer, Quiet hours, Copy a chore, Reward note.
- [ ] CLAUDE.md `redemptions` line lists `note?`.
- [ ] A docs test fails before and passes after.

## Affected users
Docs only (admin, member, readonly TV view unaffected).

## Constraints
Docs and a test only. No src change, no new dependency, no Firebase/DB change.

## Open questions
None.

## Verification
`npm test` (new tests/docs-readme-drift-nov28.test.js), `npm run build`.
