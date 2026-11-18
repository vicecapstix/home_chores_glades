# Plan #357
Files: src/firebase.js (reserveStock/releaseStock), src/redemptions.js (reserve on request, release on deny/undo/failure), src/rewards.js (validate, card, edit form), src/index.html + style.css (input), CLAUDE.md, tests/reward-stock.test.js, root build files.
Tests: validation, card/sold-out render, request at 0 refused, reserve + release paths, member cannot edit, READONLY, unlimited unaffected.
Rollback: revert PR; the extra `stock` field is ignored by old code (rewards stay unlimited).
