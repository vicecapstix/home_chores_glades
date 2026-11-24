# Plan: #390

## Files
- `src/rewards.js`: `editingStock`, leaf-path update in `saveReward` for edits.
- `tests/reward-edit-stock.test.js` (new, committed first and failing).
- Three existing tests that asserted the old whole-object edit payload are updated to the leaf shape (behaviour unchanged): `reward-limits`, `reward-soldout-edit`, `rewards`.
- Root deploy files via `npm run build:pages`.

## Steps
1. Docs + failing test. 2. Fix + adjust payload-shape tests. 3. `npm test`, `npm run build:pages`.

## Test plan
Rename-only save after stock changed in state: payload has no stock path. Changing stock applies the delta to the live value. Unlimited toggles. Clamp 0..99. Non-admin and READONLY write nothing. New reward unchanged.

## Rollback
Revert the PR; data shape is identical.
