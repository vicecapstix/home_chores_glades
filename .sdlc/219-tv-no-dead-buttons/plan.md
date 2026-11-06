# Plan — #219
Files: `src/render.js` (2 conditionals), `tests/tv-no-dead-buttons.test.js` (new), root deploy files via `npm run build:pages`.
Steps: failing test (committed first) -> implement -> build:pages.
Test plan: READONLY cardHTML has no btn-claim / toggleTask / button.check; normal mode keeps both (claim button, toggleTask).
Rollback: revert PR.
