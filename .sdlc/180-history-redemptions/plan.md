# Plan #180

## Files
- `src/history.js`: `redemptionEvents`, `historyEvents`; `historyHTML` takes optional `redemptions`; `renderHistory` passes `state.redemptions`.
- `src/style.css`: `.hist-pts.neg`.
- `tests/history-redemptions.test.js`: merge order, member filter, refund rows, cap, XSS.
- Root build files via `npm run build:pages`.

## Rollback
Revert the PR; no data changes.
