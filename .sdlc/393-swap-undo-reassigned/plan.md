# Plan — #393
Files: `src/swaps.js` (undo branch), `tests/swap-undo-reassigned.test.js` (new), root deploy files via `npm run build:pages`.
Steps: 1) failing test committed first; 2) replace silent `return` with `throw`; 3) test + build; 4) build:pages.
Test plan: reassigned → rejects, no writes; untouched → still restores (covered by swap-undo-ticked tests).
Rollback: revert the merge commit.
