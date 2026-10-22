# Plan
Files: new `src/savings.js` (progress maths, HTML, set/clear), `src/rewards.js` (buttons + admin target select), `src/render.js` (chip), `src/tv.js` (TV chip), `src/main.js` (window handlers), `src/style.css`, `tests/savings.test.js`, rebuilt root files.
Steps: helpers + tests, then UI wiring, then `npm run build:pages`.
Tests: set/clear/replace, ownership guard, admin override, deleted reward, progress maths, readonly no-op, chip/TV rendering, XSS.
Rollback: revert the PR; leftover `goalRewardId` fields are ignored by old code.
