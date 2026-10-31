# Plan — #230

1. Failing tests first in tests/away-extend.test.js: extending keeps awaySince (patchMember gets only awayUntil); fresh away still sets awaySince; extend + return shifts by the full time away.
2. Fix in src/away.js: build `fields` with awaySince only when the member has none.
3. `npm test`, `npm run build:pages`, commit root files.

Rollback: revert the PR.
