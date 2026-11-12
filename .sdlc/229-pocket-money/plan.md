# Plan: Pocket money (#229)

## Files
- new `src/pocketmoney.js` (validRate, owed, owedHTML, setPocketMoney, clearPocketMoney, markPaid, admin HTML)
- `src/utils.js` payoutList (pure, shared by ui.js to avoid a circular import)
- `src/state.js`, `src/cache.js`, `src/main.js`: carry `pocketMoney`; window handlers; admin panel wiring
- `src/render.js`, `src/tv.js`: owed text on chips / TV strip; `src/style.css` `.chip-owed`
- `src/ui.js`: payout rows in exportCSV
- `CLAUDE.md`: file + data docs
- tests: `tests/pocketmoney.test.js`, `pocketmoney-readonly.test.js`, `pocketmoney-export.test.js`

## Steps
1. Pure helpers + tests. 2. Admin writes with guards/undo. 3. Display wiring. 4. CSV. 5. Docs, `npm test`, `npm run build:pages`, commit root files.

## Test plan
Rate validation, admin/non-admin/READONLY, owed (none, since last, floor, negative), TV display + escape, cap 52, undo, failure, in-flight guard, CSV rows, backup includes payouts.

## Rollback
Revert the merge commit. Orphan data (`pocketMoney`, `payouts`) is ignored by older code; delete the keys by hand if desired.
