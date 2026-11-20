# Plan #357
Files: src/firebase.js (reserveStock/releaseStock), src/redemptions.js (reserve on request, release on deny/undo/failure), src/rewards.js (validate, card, edit form), src/index.html + style.css (input), CLAUDE.md, tests/reward-stock.test.js, root build files.
Tests: validation, card/sold-out render, request at 0 refused, reserve + release paths, member cannot edit, READONLY, unlimited unaffected.
Rollback: revert PR; the extra `stock` field is ignored by old code (rewards stay unlimited).

## Round 3 (19-20 Nov): lead-engineer blocker on sold-out edit
- `validateReward` accepts stock 0 (sold out); input `min="0"`; so editing a reward at stock 0 saves and keeps it sold out.
- Failed `releaseStock` on deny / member removal now toasts instead of being swallowed.
- Tests: `tests/reward-soldout-edit.test.js` (failing first). `reward-stock.test.js` line 40 updated: 0 is now valid.
