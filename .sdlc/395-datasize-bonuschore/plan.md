# Plan — #395
Files: `src/datasize.js` (add `'bonusChore'` to `DB_KEYS`), `tests/datasize.test.js` (failing test committed first), root deployed files via `npm run build:pages`.
Steps: failing test -> one-word fix -> `npm test` -> `npm run build:pages`.
Test plan: bonusChore set adds exactly its JSON bytes plus key overhead; bonusChore null adds nothing.
Rollback: revert the PR; display-only.
