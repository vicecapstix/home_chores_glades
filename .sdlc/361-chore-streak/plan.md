# Plan — #361
Files: new `src/chorestreak.js` (pure helper + tag), `src/render.js` (one import, one tag in `task-meta`), `tests/chore-streak.test.js`, root deploy files via `build:pages`, CLAUDE.md file-structure line.
Steps: 1) helper + tests; 2) wire tag in `cardHTML`; 3) `npm test`, `npm run build`; 4) `build:pages`.
Test plan: one test per acceptance criterion plus daily/weekly/interval/weekdays/monthly, missed period, current period pending, other tasks and bonus/swap entries ignored.
Rollback: revert the merge commit (no data written).
