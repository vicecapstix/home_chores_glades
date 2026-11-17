# Plan: #349

## Files
- `src/weekics.js`: rewrite `icsFold` to count UTF-8 octets per code point.
- `tests/week-ics-fold-bytes.test.js`: emoji, accents, boundary emoji, CJK; byte length, no lone surrogate, round trip, ASCII unchanged (5 fail on main, committed first).
- Root `index.html` rebuilt with `npm run build:pages`.

## Test plan
`npm test` (existing `week-ics.test.js` fold tests must still pass), `npm run build`.

## Rollback
Revert the PR; no data changes.
