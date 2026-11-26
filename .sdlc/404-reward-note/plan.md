# Plan — #404
Files: `src/redemptions.js` (`cleanNote`, `requestReward(…, note)`), `src/rewards.js` (show notes, toggle input), `src/history.js` (label), `src/index.html` (input), `src/main.js` (pass note), `src/style.css` (tiny input/note rules), `tests/reward-note.test.js`, root files via `build:pages`.
Steps: 1) tests per acceptance criterion; 2) implement; 3) `npm test`, `npm run build`; 4) `build:pages`.
Test plan: saved, trimmed to 60, whitespace collapsed, empty omitted, escaped in 4 views, READONLY blocked, member without account blocked.
Rollback: revert the merge commit; extra `note` fields on existing entries are ignored by older code.
