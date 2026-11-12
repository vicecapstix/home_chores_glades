# Plan: chore swap (#228)

## Files
- new `src/swaps.js` (offer/accept/decline, expiry, render, picker)
- `src/state.js`, `src/main.js`, `src/firebase.js`: carry `swaps` like `claims`; `main.js` window handlers
- `src/render.js`: swap icon on card, `renderSwaps()` call
- `src/index.html`, `src/style.css`: `#swaps-section`, `#swap-modal`
- `src/utils.js`, `src/ui.js`, `src/history.js`: count only untyped history entries as completions
- `tests/swaps.test.js`, `tests/swaps-readonly.test.js`; `tests/a11y.test.js` close-button count 15 -> 16
- `CLAUDE.md` docs; root files via `npm run build:pages`

## Steps
1. Data wiring. 2. swaps.js logic. 3. UI. 4. History-type fix. 5. Tests. 6. Docs, build:pages, push.

## Test plan
Vitest, Firebase mocked: offer (ok, wrong member, invalid, duplicate, cap 50, prune expired, write failure), accept (patch, history, undo, wrong member, double tap), decline/cancel, expiry (24 h, done, reset, reassigned), READONLY, esc().

## Rollback
Revert the PR and rebuild root files. A leftover `state/swaps` node is ignored by older code (clients without the field drop it only on a full `writeState`, which is harmless since offers are transient).
