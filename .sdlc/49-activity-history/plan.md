# Plan — #49
## Files
- `src/history.js` (new): `recentCompletions(history, member, limit)`, `historyHTML(...)`, `openHistory`, `setHistoryFilter`.
- `src/index.html`: header button + `#history-modal`.
- `src/style.css`: modal rule pair + row styles.
- `src/main.js`: window handlers.
- `tests/history.test.js`, root deploy files via `npm run build:pages`.
## Steps
1. Tests for acceptance criteria. 2. Implement module. 3. Wire HTML/CSS/main. 4. `npm test`, `build:pages`.
## Test plan
Pure-function tests (order, cap 50, filter, Anyone, empty) + DOM tests (esc of malicious names, filter buttons, modal opens/hidden class, no write controls).
## Rollback
Revert the PR (additive; no data changes).
